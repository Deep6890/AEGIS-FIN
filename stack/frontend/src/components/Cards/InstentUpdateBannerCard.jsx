export default function InstentUpdateBannerCard(props) {
    return (
        <div
            className="
        w-full
        max-w-[250px]
        min-h-[110px]
        sm:min-h-[140px]
        p-5
        bg-[#2a2a2a]
        rounded-2xl 
        flex
        flex-col
        justify-between
        shadow-lg
        border border-white/5
        hover:border-white/10
        transition-all
        duration-300
        hover:shadow-xl
        hover:scale-[1.02]
      "
        >
            <p className="text-xs sm:text-sm text-white/60 font-medium tracking-wide uppercase">
                {props.header}
            </p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/95 tracking-tight">
                {props.value}
            </p>
        </div>
    );
}