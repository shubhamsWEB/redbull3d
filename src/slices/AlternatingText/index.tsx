"use client";

import { Bounded } from "@/components/Bounded";

import { View } from "@react-three/drei";
import Scene from "./Scene";
import clsx from "clsx";
import { data } from './constants';
/**
 * Props for `AlternatingText`.
 */

/**
 * Component for "AlternatingText" Slices.
 */
const AlternatingText = ({ slice }: any): JSX.Element => {
  return (
    <Bounded
      // data-slice-type={slice.slice_type}
      // data-slice-variation={slice.variation}
      className="alternating-text-container relative bg-[#fff] text-sky-950"
    >
      <div className="w-full">
        <div className="relative z-[100] grid">
          <View className="alternating-text-view absolute left-0 top-0 h-screen w-full">
            <Scene />
          </View>

          {data.map((item, index) => (
            <div
              key={index}
              className="alternating-section grid h-screen place-items-center gap-x-12 md:grid-cols-2"
            >
              <div
                className={clsx(
                  index % 2 === 0 ? "col-start-1" : "md:col-start-2",

                  "rounded-lg p-4 backdrop-blur-lg max-md:bg-white/30",
                )}
              >
                <h2 className="text-balance text-6xl font-bold">
                  Red Bull<br /> <h6 style={{ color: item.color, background: '#fff'}}>{item.title}</h6>
                </h2>
                <div className="mt-4 text-xl">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Bounded>
  );
};

export default AlternatingText;
