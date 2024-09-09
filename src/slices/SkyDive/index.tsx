"use client";

import { Bounded } from "@/components/Bounded";
import Scene from "./Scene";
import { View } from "@react-three/drei";
/**
 * Props for `SkyDive`.
 */

/**
 * Component for "SkyDive" Slices.
 */
const SkyDive = ({ slice }: any): JSX.Element => {
  return (
    <Bounded
      // data-slice-type={slice.slice_type}
      // data-slice-variation={slice.variation}
      className="skydive h-screen"
    >
      <h2 className="sr-only">Hello</h2>
      <View className="h-screen w-screen">
        <Scene
          flavor={'watermelon'}
          sentence={'GIVES YOU WINGSSSS'}
        />
      </View>
    </Bounded>
  );
};

export default SkyDive;
