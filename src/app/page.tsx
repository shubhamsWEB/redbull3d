import Image from "next/image";
import Hero from '../slices/Hero';
import SkyDive from "@/slices/SkyDive";
import Carousel from "@/slices/Carousel";
import Text from "@/slices/AlternatingText";
export default function Home() {
  return (
    <>
  
    <Hero/>
    <SkyDive />
    <Carousel/>
    <Text/>
    </>
  );
}
