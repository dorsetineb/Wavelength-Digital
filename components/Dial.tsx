import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GamePhase } from '../types';

interface DialProps {
  phase: GamePhase;
  targetAngle: number | null;
  guessAngle: number;
  onAngleChange: (angle: number) => void;
  isSpinning?: boolean;
}

const Dial: React.FC<DialProps> = ({ phase, targetAngle, guessAngle, onAngleChange, isSpinning = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ignoreClickRef = useRef(false); 
  
  const rotationRef = useRef(0);
  const [displayRotation, setDisplayRotation] = useState(0);

  const CX = 150;
  const CY = 150;
  const R = 120; // Radius
  
  // Update rotation when targetAngle changes
  useEffect(() => {
    if (targetAngle !== null) {
      const currentRot = rotationRef.current;
      const targetRotationValue = targetAngle - 90;
      
      const minSpin = 2520;
      let nextRot = currentRot + minSpin;
      
      const currentMod = currentRot % 360;
      let diff = targetRotationValue - currentMod;
      
      while (diff < minSpin) {
          diff += 360;
      }
      
      const finalRot = currentRot + diff;
      
      rotationRef.current = finalRot;
      setDisplayRotation(finalRot);
    }
  }, [targetAngle]);


  const getCoordinates = (angleInDegrees: number, radius: number) => {
    const radians = (180 + angleInDegrees) * (Math.PI / 180);
    return {
      x: CX + radius * Math.cos(radians),
      y: CY + radius * Math.sin(radians),
    };
  };

  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // Scale Logic:
    // The SVG viewBox is 300x170.
    // The rendered element might be different size.
    // We map the mouse position to the SVG coordinate space (roughly)
    // or better yet, calculate the center in screen pixels and use that.
    
    // Visual center in SVG coords is CX(150), CY(150).
    // Viewbox is 0,0,300,170.
    const viewBoxWidth = 300;
    const viewBoxHeight = 170;
    
    // Calculate center relative to the bounding box
    const centerXRelative = (CX / viewBoxWidth) * rect.width;
    const centerYRelative = (CY / viewBoxHeight) * rect.height;
    
    const centerXPx = rect.left + centerXRelative;
    const centerYPx = rect.top + centerYRelative;

    const dx = clientX - centerXPx;
    const dy = clientY - centerYPx;

    // Calculate angle in degrees from -180 to 180
    // Right = 0, Down = 90, Left = 180/-180, Up = -90
    const rad = Math.atan2(dy, dx);
    const deg = rad * (180 / Math.PI);

    // Map to Game Coordinates (0 = Left, 90 = Up, 180 = Right)
    // Formula: GameAngle = deg + 180
    // -180 (Left) -> 0
    // -90 (Up) -> 90
    // 0 (Right) -> 180
    
    let gameAngle = deg + 180;

    // Handle clamping for bottom half
    // If the user drags into the bottom half (dy > 0 usually, or angle > 0 and < 180 in `deg` terms?)
    // Actually, `deg` is -180 to 180.
    // Top half is -180 to 0.
    // Bottom half is 0 to 180.
    
    // gameAngle range logic:
    // If deg is in [-180, 0] -> gameAngle is [0, 180]. (Valid Range)
    // If deg is in (0, 180] -> gameAngle is (180, 360]. (Bottom Range)
    
    if (gameAngle > 180) {
        // We are in the bottom half. Snap to nearest side.
        // Bottom-Left (deg > 90) -> Snap to 0.
        // Bottom-Right (deg <= 90) -> Snap to 180.
        if (deg > 90) {
            gameAngle = 0;
        } else {
            gameAngle = 180;
        }
    }

    onAngleChange(gameAngle);
  }, [onAngleChange]);

  // Window-level listeners
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
        if (isDragging && phase === GamePhase.GUESSING) {
            handleInteraction(e.clientX, e.clientY);
        }
    };
    const onUp = () => {
        if (isDragging) {
            setIsDragging(false);
            
            ignoreClickRef.current = true;
            setTimeout(() => {
                ignoreClickRef.current = false;
            }, 200);
        }
    };
    
    const onTouchMove = (e: TouchEvent) => {
        if (isDragging && phase === GamePhase.GUESSING) {
            handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, phase, handleInteraction]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== GamePhase.GUESSING) return;
      
      e.stopPropagation(); 
      setIsDragging(true);
      
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }
      handleInteraction(clientX, clientY);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
      if (ignoreClickRef.current) {
          e.stopPropagation();
          e.preventDefault();
      }
  };

  const renderWedgeGraphic = () => {
      const centerAngle = 90; 
      const centerSize = 8;
      const midSize = 22;
      const outSize = 36;

      const createPath = (size: number, color: string) => {
        const start = Math.max(0, centerAngle - size / 2);
        const end = Math.min(180, centerAngle + size / 2);
        const startCoord = getCoordinates(start, R);
        const endCoord = getCoordinates(end, R);

        return (
             <path 
                d={`M ${CX} ${CY} L ${startCoord.x} ${startCoord.y} A ${R} ${R} 0 0 1 ${endCoord.x} ${endCoord.y} Z`} 
                fill={color} 
             />
        );
      };

      return (
          <g>
              {createPath(outSize, "#e67e22")}
              {createPath(midSize, "#3498db")}
              {createPath(centerSize, "#e74c3c")}
          </g>
      );
  };

  const renderScores = () => {
      if (phase !== GamePhase.VIEW_TARGET && phase !== GamePhase.REVEAL) return null;
      if (targetAngle === null) return null;

      const renderText = (text: string, offsetAngle: number) => {
          const finalAngle = targetAngle + offsetAngle;
          const textDist = R - 12; 
          const coords = getCoordinates(finalAngle, textDist);
          
          return (
              <text
                x={coords.x}
                y={coords.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="900"
                style={{ 
                    pointerEvents: 'none', 
                    userSelect: 'none', 
                    textShadow: '0px 1px 2px rgba(0,0,0,0.3)' 
                }}
              >
                {text}
              </text>
          );
      };

      return (
          <g className="fade-in">
              {renderText("4", 0)}
              {renderText("3", -7.5)}
              {renderText("3", 7.5)}
              {renderText("2", -14.5)}
              {renderText("2", 14.5)}
          </g>
      );
  };

  const renderCover = () => {
    const isClosed = phase === GamePhase.GUESSING;
    const startCoord = getCoordinates(0, R + 2);
    const endCoord = getCoordinates(180, R + 2);
    
    const d = `
        M ${CX} ${CY}
        L ${startCoord.x} ${startCoord.y}
        A ${R+2} ${R+2} 0 0 1 ${endCoord.x} ${endCoord.y}
        Z
    `;

    return (
        <path 
            d={d} 
            fill="#90cbb7" 
            className="cover-transition origin-bottom"
            style={{ 
                transformOrigin: `${CX}px ${CY}px`,
                transform: 'scale(1)',
                opacity: isClosed ? 1 : 0,
                pointerEvents: 'auto',
                cursor: phase === GamePhase.GUESSING ? 'pointer' : 'default'
            }}
        />
    );
  };

  return (
    <div 
        className="relative w-full aspect-[2/1] mx-auto select-none touch-none"
        style={{ cursor: 'pointer' }}
        onClickCapture={handleClickCapture}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
    >
      <svg 
        ref={svgRef}
        viewBox="0 0 300 170" 
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8ede0" />
            <stop offset="100%" stopColor="#f8ede0" />
          </linearGradient>
          
          <clipPath id="dialMask">
             <path d={`M ${CX} ${CY} L ${getCoordinates(0, R).x} ${getCoordinates(0, R).y} A ${R} ${R} 0 0 1 ${getCoordinates(180, R).x} ${getCoordinates(180, R).y} Z`} />
          </clipPath>
        </defs>

        {/* 1. Main Background Semi-Circle */}
        <path 
            d={`M ${CX} ${CY} L ${getCoordinates(0, R).x} ${getCoordinates(0, R).y} A ${R} ${R} 0 0 1 ${getCoordinates(180, R).x} ${getCoordinates(180, R).y} Z`} 
            fill="url(#bgGradient)" 
            stroke="#d1ccc0"
            strokeWidth="2"
        />

        {/* 2. Target Zone (Masked) */}
        <g clipPath="url(#dialMask)">
            <g 
                style={{ 
                    transformOrigin: `${CX}px ${CY}px`,
                    transform: `rotate(${displayRotation}deg)`,
                    transition: isSpinning ? 'transform 3s cubic-bezier(0.65, 0, 0.15, 1)' : 'none'
                }}
            >
                {renderWedgeGraphic()}
            </g>
        </g>

        {/* 3. The Cover (Screen) */}
        {renderCover()}
        
        {/* 4. Score Numbers */}
        {renderScores()}

        {/* 5. Ticks / Decorations */}
        <path d={`M ${CX-R-10} ${CY} L ${CX+R+10} ${CY}`} stroke="#bdc3c7" strokeWidth="4" strokeLinecap="round"/>

        {/* 6. The Needle (Red Pointer) */}
        <g 
            className={isDragging ? "" : "needle-transition"}
            style={{ 
                transformOrigin: `${CX}px ${CY}px`,
                transform: `rotate(${guessAngle - 90}deg)`,
                cursor: phase === GamePhase.GUESSING ? 'grab' : 'default',
            }}
            onClick={(e) => e.stopPropagation()}
        >
             {/* Invisible hitbox for easier grabbing */}
             <rect x={CX - 25} y={CY - R - 30} width={50} height={R + 60} fill="transparent" />
            <rect x={CX - 3} y={CY - R - 15} width={6} height={R + 15} fill="#c0392b" rx={3} />
            <circle cx={CX} cy={CY} r={18} fill="#c0392b" />
        </g>

      </svg>
    </div>
  );
};

export default Dial;