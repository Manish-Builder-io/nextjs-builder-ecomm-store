 "use client";

 import React, { useRef } from "react";

 type HostedVideoConfiguration = {
   desktopSrc: string;
   tabletSrc?: string;
   mobileSrc?: string;
   autoPlay?: boolean;
 };

 export type VideoPlayerProps = {
   videoType?: "hosted internally";
   hostedVideoConfiguration: HostedVideoConfiguration;
   controlColor?: "light" | "dark";
   posterAlt?: string;
   description?: string;
   posterImage?: string;
   showControls?: boolean;
   preventMainPlayButtonClick?: boolean;
   showFullscreen?: boolean;
   duration?: boolean | string | number;
 };

 const VideoPlayer: React.FC<VideoPlayerProps> = ({
   videoType = "hosted internally",
   hostedVideoConfiguration,
   controlColor = "light",
   posterAlt = "",
   description = "",
   posterImage,
   showControls = true,
   preventMainPlayButtonClick = false,
   showFullscreen = true,
   duration,
 }) => {
   const videoRef = useRef<HTMLVideoElement | null>(null);

   const { desktopSrc, tabletSrc, mobileSrc, autoPlay } = hostedVideoConfiguration;

   const handleMainClick = () => {
     if (preventMainPlayButtonClick || !videoRef.current) return;
     if (videoRef.current.paused) {
       void videoRef.current.play();
     } else {
       videoRef.current.pause();
     }
   };

   const controlThemeClass =
     controlColor === "dark" ? "text-white" : "text-gray-900";

   return (
     <div className={`w-full max-w-full ${controlThemeClass}`}>
       {description && (
         <p className="mb-2 text-sm text-gray-600">{description}</p>
       )}
       <div className="relative overflow-hidden rounded-lg bg-black">
         <video
           ref={videoRef}
           className="h-auto w-full"
           autoPlay={autoPlay}
           muted={autoPlay}
           loop={autoPlay}
           controls={showControls}
           playsInline
           poster={posterImage}
         >
           {mobileSrc && (
             <source
               src={mobileSrc}
               media="(max-width: 640px)"
             />
           )}
           {tabletSrc && (
             <source
               src={tabletSrc}
               media="(max-width: 1024px)"
             />
           )}
           <source src={desktopSrc} />
           Your browser does not support the video tag.
         </video>

         {!preventMainPlayButtonClick && (
           <button
             type="button"
             onClick={handleMainClick}
             className="absolute inset-0 flex items-center justify-center bg-black/0 focus:outline-none"
             aria-label="Play or pause video"
           >
             {/* Transparent button overlay to capture clicks without visible UI */}
           </button>
         )}

         {typeof duration !== "undefined" && duration !== false && (
           <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
             {typeof duration === "boolean" ? "" : duration}
           </div>
         )}

         {!showFullscreen && (
           <style jsx>{`
             video::-webkit-media-controls-fullscreen-button {
               display: none !important;
             }
             video::-moz-fullscreen-button {
               display: none !important;
             }
           `}</style>
         )}
       </div>
     </div>
   );
 };

 export default VideoPlayer;

