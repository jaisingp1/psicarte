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
      <div className={`relative ${getIconSize()} flex items-center justify-center overflow-hidden rounded-full border border-gold/30 shadow-sm`}>
        <img 
          src="/assets/logo.jpg" 
          alt="PsicArte Logo" 
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
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
