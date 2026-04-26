import { useRef, useState } from "react";
import {
  Player,
  Controls,
  IPlayerProps,
  PlayerEvent,
} from "@lottiefiles/react-lottie-player";
import { AnimationItem } from "lottie-web";

interface LottiePlayerProps {
  src: IPlayerProps["src"];
  onLottieReady?: (lottie: AnimationItem) => void;
}

export const LottiePlayer = ({ src, onLottieReady }: LottiePlayerProps) => {
  const playerRef = useRef<Player>(null);
  const [lottie, setLottie] = useState<AnimationItem>();

  const handleLottieRef = (item: AnimationItem) => {
    setLottie(item);
    onLottieReady?.(item);
  };

  const handleEvent = (event: PlayerEvent) => {
    // When the animation is updated we want to keep the animation
    // at the current frame, rather than it resetting to the start.
    if (lottie && event === PlayerEvent.InstanceSaved) {
      playerRef.current?.setSeeker(lottie?.currentFrame);
    }
  };

  return (
    <Player
      ref={playerRef}
      lottieRef={handleLottieRef}
      onEvent={handleEvent}
      src={src}
      loop
      autoplay
      className="h-[80vh]"
    >
      <Controls visible buttons={["play", "stop", "repeat", "frame"]} />
    </Player>
  );
};
