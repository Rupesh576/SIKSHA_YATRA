import Image from "next/image";

export function Brand() {
  return (
    <div className="w-32 shrink-0 sm:w-36">
      <Image
        src="/stemtech-logo.webp"
        alt="Stemtech Innovation Foundation"
        width={288}
        height={221}
        priority
        unoptimized
        sizes="(max-width: 640px) 128px, 144px"
        className="h-auto w-full"
      />
    </div>
  );
}
