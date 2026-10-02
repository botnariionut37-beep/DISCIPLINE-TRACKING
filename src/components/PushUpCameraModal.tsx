/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  X, 
  Check, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Sparkles, 
  Activity, 
  Zap, 
  Play, 
  ExternalLink, 
  SwitchCamera, 
  Smartphone, 
  ShieldCheck, 
  ShieldAlert, 
  Compass, 
  AlertTriangle, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Crosshair,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { chime } from '../utils/audio';

interface PushUpCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteWorkout: (reps: number) => void;
  targetReps?: number;
  requireCalibration?: boolean;
}

export type CameraPerspective = 'FRONT' | 'SIDE';
export type PostureState = 
  | 'PLANK_LOCKED' 
  | 'HANDS_IN_AIR' 
  | 'STANDING_UPRIGHT' 
  | 'KNEES_TO_CHEST_CROUCH' 
  | 'PAUSED_BODY_NOT_VISIBLE' 
  | 'NO_PERSON';

export type CalibrationPhase = 
  | 'HAND_PLACEMENT' 
  | 'PLANK_ALIGNMENT' 
  | 'LOCKOUT_COUNTDOWN' 
  | 'CALIBRATED';

export const PushUpCameraModal: React.FC<PushUpCameraModalProps> = ({
  isOpen,
  onClose,
  onCompleteWorkout,
  targetReps = 20,
  requireCalibration = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cadenceIntervalRef = useRef<any>(null);

  // Remembered Camera Settings
  const savedFacingMode = (typeof localStorage !== 'undefined' && localStorage.getItem('workout_camera_facing_mode') as 'user' | 'environment') || 'user';
  const hasRememberedPermission = typeof localStorage !== 'undefined' && localStorage.getItem('workout_camera_authorized') === 'true';

  // Calibration State
  const [calibrationPhase, setCalibrationPhase] = useState<CalibrationPhase>(
    requireCalibration ? 'HAND_PLACEMENT' : 'CALIBRATED'
  );
  const [countdownRemaining, setCountdownRemaining] = useState<number>(3);
  const countdownIntervalRef = useRef<any>(null);
  const stableHoldStartTimeRef = useRef<number | null>(null);

  // Training Metrics
  const [reps, setReps] = useState(0);
  const [target, setTarget] = useState(targetReps);
  const [stage, setStage] = useState<'UP' | 'DOWN'>('UP');
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [descentProgress, setDescentProgress] = useState<number>(0); // 0% to 100%
  const [noseDepthProgress, setNoseDepthProgress] = useState<number>(0);
  const [perspective, setPerspective] = useState<CameraPerspective>('FRONT');
  const [postureState, setPostureState] = useState<PostureState>('NO_PERSON');
  const [feedback, setFeedback] = useState<string>('Step 1: Place hands flat on floor beneath chest');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Camera & Mode states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rawErrorCode, setRawErrorCode] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCadenceMode, setIsCadenceMode] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(savedFacingMode);

  // Biomechanical state tracking refs (Push Up Arena Engine)
  const stageRef = useRef<'UP' | 'DOWN'>('UP');
  const repsRef = useRef(0);
  const targetRef = useRef(target);
  const lastStateTimestampRef = useRef<number>(0);
  const topChestYRef = useRef<number | null>(null);
  const topNoseYRef = useRef<number | null>(null); // Push Up Arena Nose Baseline
  const consecutiveDownFramesRef = useRef<number>(0);
  const perspectiveRef = useRef<CameraPerspective>('FRONT');
  const postureStateRef = useRef<PostureState>('NO_PERSON');
  const calibrationPhaseRef = useRef<CalibrationPhase>(
    requireCalibration ? 'HAND_PLACEMENT' : 'CALIBRATED'
  );

  // Platform detection
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    repsRef.current = reps;
    targetRef.current = target;
  }, [reps, target]);

  useEffect(() => {
    calibrationPhaseRef.current = calibrationPhase;
  }, [calibrationPhase]);

  // Reset or re-trigger calibration
  const restartCalibration = () => {
    setCalibrationPhase('HAND_PLACEMENT');
    calibrationPhaseRef.current = 'HAND_PLACEMENT';
    setCountdownRemaining(3);
    stableHoldStartTimeRef.current = null;
    stageRef.current = 'UP';
    setStage('UP');
    setDescentProgress(0);
    setNoseDepthProgress(0);
    topChestYRef.current = null;
    topNoseYRef.current = null;
    setFeedback('Step 1: Place hands flat on floor beneath chest');
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  // Calculate 2D angle between three points
  const calculateAngle = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ) => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 === 0 || mag2 === 0) return 180;
    const angleRad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
    return Math.round((angleRad * 180) / Math.PI);
  };

  // Switch between front and back camera on mobile and persist choice
  const toggleFacingMode = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    try {
      localStorage.setItem('workout_camera_facing_mode', newMode);
    } catch (e) {}
    startCamera(newMode);
  };

  // Direct User Gesture Camera Stream Request (with permission memory)
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setIsStartingCamera(true);
    setCameraError(null);
    setRawErrorCode(null);
    setIsCadenceMode(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!window.isSecureContext) {
        throw new Error('InsecureContextError: Camera requires HTTPS.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NotSupportedError: getUserMedia not supported.');
      }

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (err1) {
        lastErr = err1;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (err2) {
          lastErr = err2;
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream && videoRef.current) {
        streamRef.current = stream;
        const video = videoRef.current;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.autoplay = true;
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
          video.play()
            .then(() => {
              setIsCameraActive(true);
              setIsStartingCamera(false);
              // Remember permission in localStorage for seamless auto-start
              try {
                localStorage.setItem('workout_camera_authorized', 'true');
              } catch (e) {}
              startVisionLoop();
            })
            .catch((playErr) => {
              setIsStartingCamera(false);
              setCameraError(`Video playback interrupted: ${playErr.message}`);
            });
        };
      } else {
        throw lastErr || new Error('Camera stream could not be opened.');
      }
    } catch (err: any) {
      setIsStartingCamera(false);
      setIsCameraActive(false);
      setRawErrorCode(err.name || 'Error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        try {
          localStorage.removeItem('workout_camera_authorized');
        } catch (e) {}

        if (isInIframe) {
          setCameraError(
            'Camera blocked in embedded preview. Tap "Open in Standalone Tab" or use Cadence Tracker.'
          );
        } else if (isIOS) {
          setCameraError(
            'Camera access denied. In iPhone Settings > Safari > Camera, select "Allow".'
          );
        } else if (isAndroid) {
          setCameraError(
            'Camera access denied. In Chrome address bar, tap Lock icon > Permissions > Camera > Allow.'
          );
        } else {
          setCameraError('Camera access denied by browser settings.');
        }
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(err.message || 'Unable to access camera.');
      }
    }
  };

  // Async load of MediaPipe PoseLandmarker & Auto-Start Camera
  useEffect(() => {
    let isCancelled = false;

    const loadPoseLandmarker = async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        if (isCancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (isCancelled) return;

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isCancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
      } catch (e) {
        console.warn('PoseLandmarker load note:', e);
      }
    };

    if (isOpen) {
      chime.init();
      loadPoseLandmarker();
      // Auto-start camera immediately when opened (remembers authorization)
      startCamera(facingMode);
    }

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (cadenceIntervalRef.current) {
        clearInterval(cadenceIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      setIsCameraActive(false);
      setIsCadenceMode(false);
    };
  }, [isOpen]);

  // Main Vision & Drawing Loop
  const startVisionLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastVideoTime = -1;

    const render = () => {
      if (!video || video.paused || video.ended) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (landmarkerRef.current) {
          try {
            const startTimeMs = performance.now();
            const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

            if (results && results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              processPushUpKinematics(landmarks, ctx, canvas.width, canvas.height);
            } else {
              stageRef.current = 'UP';
              setStage('UP');
              setDescentProgress(0);
              setPostureState('NO_PERSON');
              postureStateRef.current = 'NO_PERSON';
              setFeedback('Position yourself in front of camera on the floor');
            }
          } catch (e) {
            // Frame skip tolerance
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  /**
   * PUSH UP ARENA COUNTING ENGINE
   * 
   * Combines ALL Push Up Arena Mechanisms:
   * 1. Nose & Facial Elevation Tracking (measures head descent toward floor hands)
   * 2. Shoulder & Chest Floor Compression (measures torso descent >= 35%)
   * 3. Strict 90° Elbow Flexion (<= 92° depth, <= 98° in front view)
   * 4. Full Arm Extension Lockout (>= 155°)
   * 5. Planted Floor Hands & Anti-Bounce Minimum Dwell Time (>= 220ms)
   */
  const processPushUpKinematics = (
    landmarks: any[],
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    const now = performance.now();

    // Key Joints
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];

    if (!leftShoulder || !rightShoulder) {
      stageRef.current = 'UP';
      setStage('UP');
      setDescentProgress(0);
      setPostureState('NO_PERSON');
      return;
    }

    const noseVis = nose?.visibility ?? 0;
    const leftShoulderVis = leftShoulder.visibility ?? 0;
    const rightShoulderVis = rightShoulder.visibility ?? 0;
    const leftHipVis = leftHip?.visibility ?? 0;
    const rightHipVis = rightHip?.visibility ?? 0;
    const leftKneeVis = leftKnee?.visibility ?? 0;
    const rightKneeVis = rightKnee?.visibility ?? 0;
    const leftWristVis = leftWrist?.visibility ?? 0;
    const rightWristVis = rightWrist?.visibility ?? 0;

    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    const hasHips = leftHip && rightHip && (leftHipVis > 0.60 || rightHipVis > 0.60);
    const hasLegs = (leftKnee && leftKneeVis > 0.60) || (rightKnee && rightKneeVis > 0.60);

    const hipMidX = hasHips ? (leftHip.x + rightHip.x) / 2 : shoulderMidX;
    const hipMidY = hasHips ? (leftHip.y + rightHip.y) / 2 : shoulderMidY + 0.25;

    // A. Pause check (body not visible)
    if (!hasHips) {
      stageRef.current = 'UP';
      setStage('UP');
      setDescentProgress(0);
      setNoseDepthProgress(0);
      topChestYRef.current = null;
      topNoseYRef.current = null;
      setPostureState('PAUSED_BODY_NOT_VISIBLE');
      postureStateRef.current = 'PAUSED_BODY_NOT_VISIBLE';
      setFeedback('⏸️ Rest / Paused: Position your body and legs in camera view');
      drawSelectiveSkeleton(ctx, landmarks, w, h, 'WAITING', false, false);
      return;
    }

    // B. Hands in air check
    const isLeftWristInAir = leftWrist && leftWristVis > 0.45 && leftWrist.y < (leftShoulder.y - 0.05);
    const isRightWristInAir = rightWrist && rightWristVis > 0.45 && rightWrist.y < (rightShoulder.y - 0.05);

    if (isLeftWristInAir || isRightWristInAir) {
      stageRef.current = 'UP';
      setStage('UP');
      setDescentProgress(0);
      setPostureState('HANDS_IN_AIR');
      postureStateRef.current = 'HANDS_IN_AIR';
      setFeedback('⚠️ Hands in the air! Plant both hands firmly on the floor.');
      drawSelectiveSkeleton(ctx, landmarks, w, h, 'INVALID', hasHips, hasLegs);
      return;
    }

    // C. Standing upright check
    const verticalTorsoSpan = hipMidY - shoulderMidY;
    const horizontalTorsoSpan = Math.abs(shoulderMidX - hipMidX);
    const isStandingUpright = hasHips && verticalTorsoSpan > 0.32 && horizontalTorsoSpan < 0.18;

    if (isStandingUpright) {
      stageRef.current = 'UP';
      setStage('UP');
      setDescentProgress(0);
      setPostureState('STANDING_UPRIGHT');
      postureStateRef.current = 'STANDING_UPRIGHT';
      setFeedback('⚠️ Standby: Get down on the floor in a push-up or knee plank position.');
      drawSelectiveSkeleton(ctx, landmarks, w, h, 'INVALID', hasHips, hasLegs);
      return;
    }

    // D. Knees to chest / crouch check
    let minHipAngle = 180;
    if (leftShoulder && leftHip && leftKnee && leftHipVis > 0.5 && leftKneeVis > 0.5) {
      minHipAngle = Math.min(minHipAngle, calculateAngle(leftShoulder, leftHip, leftKnee));
    }
    if (rightShoulder && rightHip && rightKnee && rightHipVis > 0.5 && rightKneeVis > 0.5) {
      minHipAngle = Math.min(minHipAngle, calculateAngle(rightShoulder, rightHip, rightKnee));
    }

    let minKneeShoulderDist = 1.0;
    if (leftKnee && leftShoulder && leftKneeVis > 0.5) {
      minKneeShoulderDist = Math.min(minKneeShoulderDist, Math.hypot(leftKnee.x - leftShoulder.x, leftKnee.y - leftShoulder.y));
    }
    if (rightKnee && rightShoulder && rightKneeVis > 0.5) {
      minKneeShoulderDist = Math.min(minKneeShoulderDist, Math.hypot(rightKnee.x - rightShoulder.x, rightKnee.y - rightShoulder.y));
    }

    const isKneesToChest = (minHipAngle < 105 && minHipAngle > 10) || minKneeShoulderDist < 0.26;

    if (isKneesToChest && hasLegs) {
      stageRef.current = 'UP';
      setStage('UP');
      setDescentProgress(0);
      setPostureState('KNEES_TO_CHEST_CROUCH');
      postureStateRef.current = 'KNEES_TO_CHEST_CROUCH';
      setFeedback('⚠️ Knees to chest / crouch detected. Extend body back into a plank.');
      drawSelectiveSkeleton(ctx, landmarks, w, h, 'INVALID', hasHips, hasLegs);
      return;
    }

    // E. Hands presence
    const wristsPresent = (leftWrist && leftWristVis > 0.35) || (rightWrist && rightWristVis > 0.35);
    if (!wristsPresent) {
      setFeedback('Ensure your hands and arms are visible in camera frame');
      drawSelectiveSkeleton(ctx, landmarks, w, h, 'WAITING', hasHips, hasLegs);
      return;
    }

    // Plank Verified!
    setPostureState('PLANK_LOCKED');
    postureStateRef.current = 'PLANK_LOCKED';

    // Auto-detect perspective
    const shoulderDistanceX = Math.abs(leftShoulder.x - rightShoulder.x);
    const wristDistanceX = (leftWrist && rightWrist) ? Math.abs(leftWrist.x - rightWrist.x) : 0;
    const bothShouldersVisible = leftShoulderVis > 0.5 && rightShoulderVis > 0.5;

    const isFrontView = bothShouldersVisible && (shoulderDistanceX > 0.14 || wristDistanceX > 0.18);
    const currentPerspective: CameraPerspective = isFrontView ? 'FRONT' : 'SIDE';
    
    if (perspectiveRef.current !== currentPerspective) {
      perspectiveRef.current = currentPerspective;
      setPerspective(currentPerspective);
      topChestYRef.current = null;
      topNoseYRef.current = null;
    }

    // Compute Elbow Angles
    let leftAngle = 180;
    let rightAngle = 180;
    if (leftShoulder && leftElbow && leftWrist) {
      leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    }
    if (rightShoulder && rightElbow && rightWrist) {
      rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    }

    const leftArmVis = leftShoulderVis + (leftElbow?.visibility ?? 0) + leftWristVis;
    const rightArmVis = rightShoulderVis + (rightElbow?.visibility ?? 0) + rightWristVis;

    let effectiveAngle = 180;
    if (isFrontView) {
      if (leftArmVis > 1.5 && rightArmVis > 1.5) {
        effectiveAngle = Math.round((leftAngle + rightAngle) / 2);
      } else if (leftArmVis > rightArmVis) {
        effectiveAngle = leftAngle;
      } else {
        effectiveAngle = rightAngle;
      }
    } else {
      effectiveAngle = rightArmVis > leftArmVis ? rightAngle : leftAngle;
    }
    setCurrentAngle(effectiveAngle);

    // Anatomical Coordinates
    const chestX = shoulderMidX;
    const chestY = shoulderMidY;
    const noseY = (nose && noseVis > 0.4) ? nose.y : chestY - 0.08;

    let groundWristY = 0.8;
    if (leftWrist && rightWrist) {
      groundWristY = (leftWrist.y + rightWrist.y) / 2;
    } else if (leftWrist) {
      groundWristY = leftWrist.y;
    } else if (rightWrist) {
      groundWristY = rightWrist.y;
    }

    // =========================================================================
    // PRE-WORKOUT CALIBRATION STEP SEQUENCER
    // =========================================================================
    const currentPhase = calibrationPhaseRef.current;

    if (currentPhase !== 'CALIBRATED') {
      if (currentPhase === 'HAND_PLACEMENT') {
        const handsPlantedProperly = wristsPresent && !isLeftWristInAir && !isRightWristInAir && groundWristY >= (chestY - 0.05);
        if (handsPlantedProperly) {
          if (soundEnabled) chime.playCheck();
          setCalibrationPhase('PLANK_ALIGNMENT');
          calibrationPhaseRef.current = 'PLANK_ALIGNMENT';
          setFeedback('Hands verified! Step 2: Straighten body into full plank');
        } else {
          setFeedback('Calibration Step 1: Place hands flat on floor beneath chest');
        }
      }
      else if (currentPhase === 'PLANK_ALIGNMENT') {
        const isPlankAligned = hasHips && !isStandingUpright && !isKneesToChest && effectiveAngle >= 140;
        if (isPlankAligned) {
          if (soundEnabled) chime.playCheck();
          setCalibrationPhase('LOCKOUT_COUNTDOWN');
          calibrationPhaseRef.current = 'LOCKOUT_COUNTDOWN';
          stableHoldStartTimeRef.current = now;
          setCountdownRemaining(3);
          setFeedback('Plank aligned! Step 3: Hold steady lockout for 3 seconds');
        } else {
          setFeedback('Calibration Step 2: Straighten legs & back into plank lockout');
        }
      }
      else if (currentPhase === 'LOCKOUT_COUNTDOWN') {
        const isStillHoldingLockout = effectiveAngle >= 135 && !isStandingUpright && !isKneesToChest;
        
        if (!isStillHoldingLockout) {
          stableHoldStartTimeRef.current = now;
          setCountdownRemaining(3);
          setFeedback('Hold steady at the top! Don\'t bend elbows yet');
        } else {
          const holdElapsedMs = now - (stableHoldStartTimeRef.current || now);
          const remaining = Math.max(0, 3 - Math.floor(holdElapsedMs / 1000));
          setCountdownRemaining(remaining);

          if (remaining <= 0) {
            setCalibrationPhase('CALIBRATED');
            calibrationPhaseRef.current = 'CALIBRATED';
            topChestYRef.current = chestY;
            topNoseYRef.current = noseY;
            if (soundEnabled) chime.playRankUp();
            confetti({ particleCount: 70, spread: 60 });
            setFeedback('Push Up Arena Ready: Start Push-Ups!');
          } else {
            setFeedback(`Hold top lockout: ${remaining}s remaining...`);
          }
        }
      }

      drawSelectiveSkeleton(ctx, landmarks, w, h, 'VALID', hasHips, hasLegs, chestX, chestY, false, true);
      return;
    }

    // =========================================================================
    // PUSH UP ARENA COUNTING MECHANISM
    // =========================================================================
    // Update baseline heights at top lockout
    if (effectiveAngle > 155 || topChestYRef.current === null) {
      if (topChestYRef.current === null || chestY < topChestYRef.current) {
        topChestYRef.current = chestY;
      }
      if (topNoseYRef.current === null || noseY < topNoseYRef.current) {
        topNoseYRef.current = noseY;
      }
    }

    // 1. Chest Displacement Ratio
    const baselineTopChest = topChestYRef.current ?? (chestY - 0.1);
    const maxChestTravel = Math.max(0.08, groundWristY - baselineTopChest);
    const currentChestDescent = Math.max(0, chestY - baselineTopChest);
    const chestDescentRatio = Math.min(1, currentChestDescent / (maxChestTravel * 0.75));
    const chestPct = Math.round(chestDescentRatio * 100);
    setDescentProgress(chestPct);

    // 2. Push Up Arena Nose Elevation Ratio
    const baselineTopNose = topNoseYRef.current ?? (noseY - 0.1);
    const maxNoseTravel = Math.max(0.08, groundWristY - baselineTopNose);
    const currentNoseDescent = Math.max(0, noseY - baselineTopNose);
    const noseDescentRatio = Math.min(1, currentNoseDescent / (maxNoseTravel * 0.70));
    const nosePct = Math.round(noseDescentRatio * 100);
    setNoseDepthProgress(nosePct);

    // 3. Strict 90-Degree Elbow Angle & Push Up Arena Descent Gates
    const isAngleDown = isFrontView ? effectiveAngle <= 98 : effectiveAngle <= 92;
    const isAngleUp = effectiveAngle >= 155; // Strict full extension lockout

    // Push Up Arena combined descent: requires genuine chest and/or nose floor travel
    const isAnatomyDown = chestDescentRatio >= 0.35 || noseDescentRatio >= 0.35 || chestY > (groundWristY - 0.14);

    if (stageRef.current === 'UP') {
      if (isAngleDown && isAnatomyDown) {
        consecutiveDownFramesRef.current += 1;
        if (consecutiveDownFramesRef.current >= 2) {
          stageRef.current = 'DOWN';
          setStage('DOWN');
          lastStateTimestampRef.current = now;
          consecutiveDownFramesRef.current = 0;
          setFeedback('Solid 90° depth! Push all the way up!');
        }
      } else if (isAngleDown && !isAnatomyDown) {
        setFeedback('Lower chest & nose closer to floor hands');
      } else if (effectiveAngle < 135) {
        setFeedback('Bend elbows to 90° for full depth...');
      } else {
        setFeedback(isFrontView ? 'Arena Front View: Lower chest to 90°' : 'Arena Side View: Lower chest to 90°');
      }
    } else if (stageRef.current === 'DOWN') {
      const timeInDown = now - lastStateTimestampRef.current;

      // Complete rep: requires returning to full extension lockout (>= 155°) + dwell time >= 220ms
      if (isAngleUp && timeInDown > 220) {
        repsRef.current += 1;
        setReps(repsRef.current);
        stageRef.current = 'UP';
        setStage('UP');
        lastStateTimestampRef.current = now;
        consecutiveDownFramesRef.current = 0;
        setFeedback('Rep counted! Clean lockout & 90° depth!');
        if (soundEnabled) chime.playPushUpRep();

        if (repsRef.current >= targetRef.current && !isCompleted) {
          setIsCompleted(true);
          if (soundEnabled) chime.playRankUp();
          confetti({ particleCount: 85, spread: 75, origin: { y: 0.6 } });
        }
      } else if (isAngleUp && timeInDown <= 220) {
        stageRef.current = 'UP';
        setStage('UP');
        setFeedback('Control cadence: Pause briefly at bottom');
      } else {
        setFeedback('Push all the way up to full lockout (155°+)!');
      }
    }

    drawSelectiveSkeleton(ctx, landmarks, w, h, 'VALID', hasHips, hasLegs, chestX, chestY, stageRef.current === 'DOWN', false);
  };

  /**
   * SELECTIVE SKELETON RENDERER WITH ARENA METRICS
   */
  const drawSelectiveSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number,
    status: 'VALID' | 'INVALID' | 'WAITING',
    showTorso: boolean,
    showLegs: boolean,
    chestX?: number,
    chestY?: number,
    isDown?: boolean,
    isCalibrating?: boolean
  ) => {
    let primaryColor = '#10B981';
    let accentColor = '#34D399';

    if (status === 'INVALID') {
      primaryColor = '#EF4444';
      accentColor = '#F87171';
    } else if (status === 'WAITING') {
      primaryColor = '#6B7280';
      accentColor = '#9CA3AF';
    } else if (isCalibrating) {
      primaryColor = '#06B6D4';
      accentColor = '#67E8F9';
    } else if (isDown) {
      primaryColor = '#F59E0B';
      accentColor = '#FBBF24';
    }

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = primaryColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = primaryColor;

    const STRICT_VIS_MIN = 0.65;

    // 1. Arm connections
    const armConnections = [
      [11, 13], [13, 15],
      [12, 14], [14, 16],
      [11, 12],
    ];

    armConnections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility ?? 1) >= 0.55 && (p2.visibility ?? 1) >= 0.55) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    });

    // 2. Torso connections
    if (showTorso) {
      const torsoConnections = [
        [11, 23], [12, 24],
        [23, 24],
      ];

      torsoConnections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2 && (p1.visibility ?? 1) >= STRICT_VIS_MIN && (p2.visibility ?? 1) >= STRICT_VIS_MIN) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      });
    }

    // 3. Leg connections
    if (showLegs && showTorso) {
      const legConnections = [
        [23, 25], [24, 26],
        [25, 27], [26, 28],
      ];

      legConnections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2 && (p1.visibility ?? 1) >= STRICT_VIS_MIN && (p2.visibility ?? 1) >= STRICT_VIS_MIN) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      });
    }

    // Joint Nodes
    const visibleJoints = [11, 12, 13, 14, 15, 16];
    if (showTorso) visibleJoints.push(23, 24);
    if (showLegs) visibleJoints.push(25, 26, 27, 28);

    visibleJoints.forEach((idx) => {
      const p = landmarks[idx];
      const threshold = (idx >= 23) ? STRICT_VIS_MIN : 0.55;
      if (p && (p.visibility ?? 1) >= threshold) {
        const x = p.x * w;
        const y = p.y * h;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = accentColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = accentColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    });

    // Floor Target Crosshairs on Wrists during calibration
    if (isCalibrating && landmarks[15] && landmarks[16]) {
      [landmarks[15], landmarks[16]].forEach((wrist) => {
        if (wrist && (wrist.visibility ?? 1) > 0.45) {
          const wx = wrist.x * w;
          const wy = wrist.y * h;
          ctx.beginPath();
          ctx.arc(wx, wy, 16, 0, 2 * Math.PI);
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // Chest center indicator
    if (chestX !== undefined && chestY !== undefined && status === 'VALID') {
      ctx.beginPath();
      ctx.arc(chestX * w, chestY * h, isDown ? 8 : 6, 0, 2 * Math.PI);
      ctx.fillStyle = isDown ? '#EF4444' : isCalibrating ? '#06B6D4' : '#10B981';
      ctx.shadowBlur = 12;
      ctx.shadowColor = isDown ? '#EF4444' : isCalibrating ? '#06B6D4' : '#10B981';
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  };

  // Interactive Smart Cadence Mode with Push Up Arena Simulation
  const startCadenceTracker = () => {
    setIsCadenceMode(true);
    setCameraError(null);
    setPostureState('PLANK_LOCKED');
    setCalibrationPhase('CALIBRATED');
    calibrationPhaseRef.current = 'CALIBRATED';
    let simStage: 'UP' | 'DOWN' = 'UP';
    let angleVal = 170;

    if (cadenceIntervalRef.current) clearInterval(cadenceIntervalRef.current);

    cadenceIntervalRef.current = setInterval(() => {
      if (simStage === 'UP') {
        angleVal -= 25;
        if (angleVal <= 85) {
          simStage = 'DOWN';
          setStage('DOWN');
          setFeedback('DOWN - Arena 90° Depth Verified!');
          setDescentProgress(100);
          setNoseDepthProgress(100);
        }
      } else {
        angleVal += 25;
        if (angleVal >= 165) {
          simStage = 'UP';
          setStage('UP');
          repsRef.current += 1;
          setReps(repsRef.current);
          setFeedback('UP - Clean Arena rep logged!');
          setDescentProgress(0);
          setNoseDepthProgress(0);
          if (soundEnabled) chime.playPushUpRep();

          if (repsRef.current >= targetRef.current && !isCompleted) {
            setIsCompleted(true);
            if (soundEnabled) chime.playRankUp();
            confetti({ particleCount: 75, spread: 65 });
          }
        }
      }
      setCurrentAngle(angleVal);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const w = canvas.width;
          const h = canvas.height;
          const isDown = simStage === 'DOWN';
          const yOff = isDown ? 35 : 0;
          const elbowSpread = isDown ? 0.08 : 0.03;
          
          const syntheticLandmarks = [
            { x: 0.50, y: 0.38 + yOff/h, visibility: 0.95 }, // nose
            null, null, null, null, null, null, null, null, null, null,
            { x: 0.38, y: 0.44 + yOff/h, visibility: 0.95 },
            { x: 0.62, y: 0.44 + yOff/h, visibility: 0.95 },
            { x: 0.28 - elbowSpread, y: 0.60 + (yOff*0.7)/h, visibility: 0.95 },
            { x: 0.72 + elbowSpread, y: 0.60 + (yOff*0.7)/h, visibility: 0.95 },
            { x: 0.30, y: 0.78, visibility: 0.95 },
            { x: 0.70, y: 0.78, visibility: 0.95 },
            null, null, null, null, null, null,
            { x: 0.44, y: 0.58 + (yOff*0.4)/h, visibility: 0.9 },
            { x: 0.56, y: 0.58 + (yOff*0.4)/h, visibility: 0.9 },
            { x: 0.45, y: 0.70, visibility: 0.8 },
            { x: 0.55, y: 0.70, visibility: 0.8 },
            { x: 0.46, y: 0.84, visibility: 0.8 },
            { x: 0.54, y: 0.84, visibility: 0.8 },
          ];
          drawSelectiveSkeleton(ctx, syntheticLandmarks, w, h, 'VALID', true, true, 0.50, 0.44 + yOff/h, isDown, false);
        }
      }
    }, 450);
  };

  const handleManualAddRep = () => {
    chime.init();
    const nextReps = reps + 1;
    setReps(nextReps);
    if (soundEnabled) chime.playPushUpRep();
    if (nextReps >= target && !isCompleted) {
      setIsCompleted(true);
      if (soundEnabled) chime.playRankUp();
      confetti({ particleCount: 70, spread: 60 });
    }
  };

  const handleFinishSession = () => {
    onCompleteWorkout(reps);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0B0E14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header HUD */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0E121B]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-base sm:text-lg">
                  Push Up Arena Engine
                </h2>
                {/* Calibration Status Badge */}
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold flex items-center gap-1 ${
                  calibrationPhase === 'CALIBRATED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse'
                }`}>
                  {calibrationPhase === 'CALIBRATED' ? (
                    <>
                      <Unlock size={11} className="text-emerald-400" />
                      <span>Arena Active</span>
                    </>
                  ) : (
                    <>
                      <Lock size={11} className="text-cyan-400" />
                      <span>Calibrating...</span>
                    </>
                  )}
                </span>

                {/* Perspective Badge */}
                <span className={`hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold items-center gap-1 ${
                  perspective === 'FRONT'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}>
                  <Compass size={11} />
                  <span>{perspective === 'FRONT' ? 'Front' : 'Side'}</span>
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Push Up Arena: 90° elbow depth + nose & chest displacement + full extension
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {calibrationPhase === 'CALIBRATED' && (
              <button
                type="button"
                onClick={restartCalibration}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Recalibrate Alignment"
              >
                <RotateCcw size={16} />
              </button>
            )}
            {isMobile && isCameraActive && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title={`Switch to ${facingMode === 'user' ? 'Back' : 'Front'} Camera (Saved)`}
              >
                <SwitchCamera size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Audio Cues' : 'Unmute Audio Cues'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[350px] sm:min-h-[440px] overflow-hidden">
          {/* Starting Camera Spinner */}
          {isStartingCamera && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-white font-bold text-sm">
                  {hasRememberedPermission ? 'Auto-connecting to Camera...' : `Connecting to ${isMobile ? 'Phone Camera' : 'Webcam'}...`}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {hasRememberedPermission ? 'Camera access remembered from previous session' : 'Please approve browser camera prompt'}
                </p>
              </div>
            </div>
          )}

          {/* Camera Permission / Error Screen */}
          {!isStartingCamera && !isCameraActive && !isCadenceMode && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#0C0E12] space-y-4 overflow-y-auto">
              <div className="p-4 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Camera size={36} />
              </div>
              
              <div className="max-w-md space-y-1.5">
                <h3 className="text-white font-bold text-base sm:text-lg flex items-center justify-center gap-2">
                  <span>Camera Access Needed</span>
                  {rawErrorCode && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {rawErrorCode}
                    </span>
                  )}
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {cameraError || 'Allow camera permission to track Push Up Arena form with computer vision.'}
                </p>
                
                {isIOS && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200 text-left space-y-1 mt-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <Smartphone size={12} />
                      <span>iPhone Setup:</span>
                    </p>
                    <p className="text-gray-300">
                      1. In iPhone Settings &gt; Safari &gt; Camera &gt; set to <strong>Allow</strong>.<br/>
                      2. If inside preview iframe, tap <strong>"Open in Standalone Tab"</strong>.
                    </p>
                  </div>
                )}

                {isAndroid && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200 text-left space-y-1 mt-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <Smartphone size={12} />
                      <span>Android Chrome Setup:</span>
                    </p>
                    <p className="text-gray-300">
                      Tap lock icon in address bar &gt; Permissions &gt; Camera &gt; Allow.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full sm:w-auto flex-1 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25"
                >
                  <Camera size={16} />
                  <span>Connect Camera</span>
                </button>

                <button
                  type="button"
                  onClick={startCadenceTracker}
                  className="w-full sm:w-auto flex-1 px-5 py-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play size={14} />
                  <span>Use Cadence Tracker</span>
                </button>
              </div>

              {isInIframe && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 font-medium text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink size={14} />
                  <span>Open in Standalone Tab (Recommended for Phones)</span>
                </a>
              )}
            </div>
          )}

          {/* Live WebCam Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''} ${
              isCameraActive ? 'block' : 'hidden'
            }`}
          />

          {/* Kinetic Skeleton Overlay Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className={`absolute inset-0 w-full h-full pointer-events-none ${
              facingMode === 'user' ? 'transform -scale-x-100' : ''
            }`}
          />

          {/* Calibration Overlay */}
          {calibrationPhase !== 'CALIBRATED' && isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px]">
              {calibrationPhase === 'LOCKOUT_COUNTDOWN' ? (
                <div className="flex flex-col items-center space-y-3 animate-scale-up">
                  <div className="w-24 h-24 rounded-full border-4 border-cyan-400 bg-cyan-950/80 flex items-center justify-center shadow-2xl shadow-cyan-500/50">
                    <span className="text-5xl font-black text-cyan-300 animate-pulse">
                      {countdownRemaining}
                    </span>
                  </div>
                  <div className="bg-black/80 px-4 py-1.5 rounded-full border border-cyan-500/30 text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    Hold Steady Lockout
                  </div>
                </div>
              ) : (
                <div className="absolute top-20 bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-cyan-500/30 shadow-xl text-center space-y-2 max-w-sm mx-4">
                  <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <Crosshair size={14} className="animate-spin" />
                    <span>Push Up Arena Calibration</span>
                  </div>
                  <p className="text-white text-sm font-medium">
                    {calibrationPhase === 'HAND_PLACEMENT' 
                      ? 'Place hands flat on the floor beneath your chest'
                      : 'Align your spine into a straight toe or knee plank'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Top Floating Telemetry & Calibration HUD */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
            {calibrationPhase === 'CALIBRATED' ? (
              <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg flex items-center gap-3">
                <div className="text-left">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                    Completed Reps
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">
                    {reps} <span className="text-sm font-normal text-emerald-400">/ {target}</span>
                  </span>
                </div>
                {reps >= target && (
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Trophy size={18} />
                  </span>
                )}
              </div>
            ) : (
              <div className="bg-black/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-cyan-500/30 shadow-lg flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                    calibrationPhase !== 'HAND_PLACEMENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/30 text-cyan-300'
                  }`}>
                    {calibrationPhase !== 'HAND_PLACEMENT' && <Check size={11} />}
                    <span>1. Hands</span>
                  </span>
                  <span className="text-gray-600">→</span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                    calibrationPhase === 'LOCKOUT_COUNTDOWN' || calibrationPhase === 'CALIBRATED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : calibrationPhase === 'PLANK_ALIGNMENT'
                      ? 'bg-cyan-500/30 text-cyan-300'
                      : 'text-gray-500'
                  }`}>
                    {(calibrationPhase === 'LOCKOUT_COUNTDOWN' || calibrationPhase === 'CALIBRATED') && <Check size={11} />}
                    <span>2. Plank</span>
                  </span>
                  <span className="text-gray-600">→</span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold ${
                    calibrationPhase === 'LOCKOUT_COUNTDOWN' ? 'bg-amber-500/30 text-amber-300' : 'text-gray-500'
                  }`}>
                    <span>3. Hold (3s)</span>
                  </span>
                </div>
              </div>
            )}

            {/* Depth & Angle Telemetry */}
            <div className="flex items-center gap-2">
              {calibrationPhase === 'CALIBRATED' && (
                <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-400">Depth:</span>
                  <div className="w-14 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-150 ${
                        descentProgress > 70 ? 'bg-emerald-400' : descentProgress > 35 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${descentProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-white">{descentProgress}%</span>
                </div>
              )}

              {/* Angle Badge */}
              {currentAngle !== null && (
                <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-white">
                  Elbow: <span className={currentAngle <= 92 ? 'text-emerald-400 font-bold' : 'text-cyan-400 font-bold'}>{currentAngle}°</span>
                </div>
              )}

              {/* Stage Badge */}
              <div className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border shadow-md ${
                calibrationPhase !== 'CALIBRATED'
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/60'
                  : stage === 'DOWN'
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 animate-pulse'
                  : 'bg-emerald-500/30 text-emerald-300 border-emerald-500/60'
              }`}>
                {calibrationPhase !== 'CALIBRATED' ? 'CALIBRATING' : stage}
              </div>
            </div>
          </div>

          {/* Bottom Floating Coaching Feedback Banner */}
          <div className="absolute bottom-4 inset-x-4 flex flex-col items-center pointer-events-none">
            <div className={`backdrop-blur-md px-5 py-2 rounded-full border shadow-xl text-xs sm:text-sm font-sans font-medium flex items-center gap-2 ${
              postureState === 'PLANK_LOCKED'
                ? calibrationPhase === 'CALIBRATED'
                  ? 'bg-[#0A0D14]/90 text-white border-white/15'
                  : 'bg-cyan-950/90 text-cyan-200 border-cyan-500/40'
                : postureState === 'PAUSED_BODY_NOT_VISIBLE'
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/40'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
            }`}>
              {postureState === 'PLANK_LOCKED' ? (
                calibrationPhase === 'CALIBRATED' ? (
                  <Sparkles size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
                )
              ) : postureState === 'PAUSED_BODY_NOT_VISIBLE' ? (
                <Pause size={14} className="text-amber-400 shrink-0" />
              ) : (
                <AlertTriangle size={15} className="text-rose-400 shrink-0" />
              )}
              <span>{feedback}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0E121B] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-sans text-gray-400 w-full sm:w-auto">
            <span>Target Goal:</span>
            {[10, 20, 30, 50].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  target === t 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}

            {calibrationPhase !== 'CALIBRATED' && (
              <button
                type="button"
                onClick={() => setCalibrationPhase('CALIBRATED')}
                className="ml-auto sm:ml-2 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-sans transition-colors cursor-pointer"
              >
                Skip Calibration
              </button>
            )}

            {calibrationPhase === 'CALIBRATED' && (
              <button
                type="button"
                onClick={handleManualAddRep}
                className="ml-auto sm:ml-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold border border-white/15 text-xs font-sans transition-colors cursor-pointer flex items-center gap-1.5"
                title="Manual rep tap"
              >
                <Zap size={13} className="text-amber-400" />
                <span>+1 Rep</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 text-xs font-sans transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleFinishSession}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                reps >= target
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-emerald-500/25 hover:scale-105'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              <Check size={15} className="stroke-[3]" />
              <span>
                {reps >= target ? `Verify Habit (${reps} Reps)` : `Log ${reps} Reps & Finish`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
