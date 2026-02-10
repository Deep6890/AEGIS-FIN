import React, { useState, useRef, useEffect } from "react";

export default function MainNavBar() {
    const items = [
        "Overview",
        "Trends",
        "Risk Analysis",
        "Risky Accounts",
        "Claim Accounts",
        "About",
    ];

    const [active, setActive] = useState("Overview");
    const containerRef = useRef(null);
    const indicatorRef = useRef(null);

    const moveIndicator = () => {
        const activeBtn = containerRef.current?.querySelector(
            `[data-item="${active}"]`
        );

        if (activeBtn && indicatorRef.current) {
            indicatorRef.current.style.width = `${activeBtn.offsetWidth}px`;
            indicatorRef.current.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
        }
    };

    useEffect(() => {
        moveIndicator();
        window.addEventListener("resize", moveIndicator);
        return () => window.removeEventListener("resize", moveIndicator);
    }, [active]);

    return (
        <div className="w-full flex justify-center px-4 py-4">
            <div
                ref={containerRef}
                className="relative h-13 w-full max-w-4xl bg-[#37363661] rounded-full flex items-center">
                {/* Centered Sliding Indicator */}
                <span
                    ref={indicatorRef}
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-12 bg-white rounded-full transition-all duration-700 ease-out shadow-lg" />

                {items.map((item) => (
                    <button
                        key={item}
                        data-item={item}
                        onClick={() => setActive(item)}
                        className={`relative z-10 flex-1 h-full flex items-center justify-center font-semibold transition-all duration-200
                ${active === item
                                ? "text-black text-base"
                                : "text-white/70 text-sm hover:text-white"
                            }
                `}
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
}
