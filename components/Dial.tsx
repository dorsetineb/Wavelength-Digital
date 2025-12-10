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
  const ignoreClickRef = useRef(false); // Ref to suppress clicks immediately after dragging
  
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
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - CX;
    const dy = y - CY;
    let theta = Math.atan2(dy, dx) * (180 / Math.PI); // degrees

    if (theta < 0) theta += 360;

    let gameAngle = 0;
    
    // Map Cartesian angle to Game Angle (0-180)
    if (theta >= 180 && theta <= 270) {
        gameAngle = theta - 180;
    } else if (theta > 270 && theta <= 360) {
        gameAngle = theta - 180;
    } else if (theta >= 0 && theta < 90) {
        gameAngle = 180;
    } else {
        if (theta > 90 && theta < 135) gameAngle = 180;
        else gameAngle = 0;
    }
    
    gameAngle = Math.max(0, Math.min(180, gameAngle));
    
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
            
            // Set a temporary flag to ignore any clicks that occur immediately after release.
            // This prevents the "Drag Release" from bubbling up as a click to the App.
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
      
      // Stop propagation so we don't trigger the global "advance" click when starting a drag
      e.stopPropagation(); 
      // Also prevent default to stop text selection or weird browser behaviors
      // e.preventDefault(); // (Optional: keeping off for now to ensure touch works)
      
      setIsDragging(true);
      
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
      // If we just finished dragging, kill the click event here.
      if (ignoreClickRef.current) {
          e.stopPropagation();
          e.preventDefault();
      }
  };

  // --- Rendering Helpers ---

  const renderWedgeGraphic = () => {
      const centerAngle = 90; 
      // Increased sizes slightly for visual weight and to fit numbers
      const centerSize = 8;   // Was 6
      const midSize = 22;     // Was 17
      const outSize = 36;     // Was 30

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
          
          // Position numbers INSIDE the radius. 
          // R = 120, so R-12 puts them nicely inside the outer rim of the wedges.
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

      // Adjusted offsets to match the centers of the new wedge bands
      // Center (4): 0 deg
      // Blue (3): The band is between 4deg and 11deg (half sizes). Center ~7.5 deg
      // Orange (2): The band is between 11deg and 18deg. Center ~14.5 deg
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
            className="needle-transition"
            style={{ 
                transformOrigin: `${CX}px ${CY}px`,
                transform: `rotate(${guessAngle - 90}deg)`,
                cursor: phase === GamePhase.GUESSING ? 'grab' : 'default'
            }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            onClick={(e) => e.stopPropagation()} /* Ensure clicking the needle (without dragging) doesn't bubble */
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