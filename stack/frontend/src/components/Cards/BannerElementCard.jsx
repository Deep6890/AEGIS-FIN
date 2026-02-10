import React from "react";

export default function BannerElementCard(props) {
    return (
        <div
            className={`w-full max-w-[220px] aspect-square ${props.overAllTextColor} rounded-2xl p-4 flex flex-col justify-between shadow-md ${props.bgColor}`}
        >
            {/* Title */}
            < div className="w-full" >
                <p className="text-xs sm:text-sm font-medium opacity-80">
                    {props.semiHeader}
                </p>
                <p className={`text-base sm:text-2xl mt-1 md:text-2xl font-semibold leading-tight  ${props.headerColor}`}>
                    {props.header}
                </p>

            </div >


            {/* Value */}
            < div className="flex items-end" >
                <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold">
                    {props.value}
                </h1>
            </div >
        </div >
    );
}
