import React from 'react';

export const BackgroundEffects: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full min-h-screen overflow-hidden pointer-events-none -z-50 select-none bg-[#FAF8F5]">
      {/* Moving Ambient Glowing Blobs with high opacity to stand out clearly in light mode */}
      <div className="absolute top-[10%] left-[5%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-gradient-to-tr from-[#16A34A]/25 via-[#22C55E]/15 to-transparent blur-3xl opacity-75 animate-float-blob-1 mix-blend-multiply" />
      <div className="absolute top-[25%] right-[5%] w-[400px] sm:w-[650px] h-[400px] sm:h-[650px] rounded-full bg-gradient-to-tr from-[#C5A028]/25 via-[#F59E0B]/15 to-transparent blur-3xl opacity-65 animate-float-blob-2 mix-blend-multiply" />
      <div className="absolute bottom-[15%] left-[15%] w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full bg-gradient-to-tr from-[#3b82f6]/20 via-[#60a5fa]/15 to-transparent blur-3xl opacity-70 animate-float-blob-3 mix-blend-multiply" />

      {/* Tech grid scanlines pattern overlay */}
      <div className="absolute inset-0 w-full h-full tech-grid opacity-35" />

      {/* Subtle radial overlay behind the text to keep perfect readability */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-[#FAF8F5]/30 to-[#FAF8F5]/90" />
    </div>
  );
};
export default BackgroundEffects;
