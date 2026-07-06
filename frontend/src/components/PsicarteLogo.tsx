import React from 'react';

interface PsicarteLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: 'dark' | 'light' | 'gold';
}

export const PsicarteLogo: React.FC<PsicarteLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'dark',
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8';
      case 'lg': return 'w-16 h-16';
      case 'xl': return 'w-24 h-24';
      case 'md': default: return 'w-12 h-12';
    }
  };

  const getTitleSize = () => {
    switch (size) {
      case 'sm': return 'text-lg';
      case 'lg': return 'text-2xl';
      case 'xl': return 'text-4xl';
      case 'md': default: return 'text-xl';
    }
  };

  const textStyle = 
    textColor === 'light' ? 'text-white' : 
    textColor === 'gold' ? 'text-gold' : 'text-secondary';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Elegantly Crafted SVG combining Psychology (Psi - Ψ) and the Arts (Blooming petals/flame/theater curve) */}
      <div className={`relative ${getIconSize()} flex items-center justify-center`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm transition-transform duration-300 hover:scale-105"
        >
          {/* Outer circle decoration representing the integrated, holistic nature of the center */}
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            stroke="#C89A4B" 
            strokeWidth="1.5" 
            strokeDasharray="4 4" 
            opacity="0.8"
          />
          
          {/* Creative blooming petals for the Art element (Borgoña) */}
          <path 
            d="M50 15 C38 25, 20 45, 30 65 C35 75, 45 80, 50 82 C55 80, 65 75, 70 65 C80 45, 62 25, 50 15 Z" 
            fill="#8B1E4F" 
            fillOpacity="0.08" 
          />
          <path 
            d="M50 18 C44 28, 30 40, 32 58 C34 68, 42 72, 50 74 C58 72, 66 68, 68 58 C70 40, 56 28, 50 18 Z" 
            stroke="#8B1E4F" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Psychology Psi Letter Ψ structured elegant lines (Gold and Deep Blue) */}
          {/* Central vertical axis with upward arrowhead representing personal growth */}
          <path 
            d="M50 80 L50 25 M50 25 L44 32 M50 25 L56 32" 
            stroke="#C89A4B" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Psi curves branching out like open wings / stage curtains */}
          <path 
            d="M28 42 C28 62, 38 68, 50 68 C62 68, 72 62, 72 42" 
            stroke="#0F2747" 
            strokeWidth="3.5" 
            strokeLinecap="round"
          />
          
          {/* Artistic sparkling dots representing creativity, mindfulness, and light */}
          <circle cx="28" cy="38" r="3" fill="#C89A4B" />
          <circle cx="72" cy="38" r="3" fill="#C89A4B" />
          <circle cx="50" cy="20" r="2.5" fill="#8B1E4F" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-serif font-bold tracking-wider ${getTitleSize()} ${textStyle}`}>
            Psic<span className="text-primary">Arte</span>
          </span>
          <span className="text-[9px] uppercase tracking-[0.25em] font-medium text-gold-dark mt-1 font-sans">
            Centro Integral
          </span>
        </div>
      )}
    </div>
  );
};
