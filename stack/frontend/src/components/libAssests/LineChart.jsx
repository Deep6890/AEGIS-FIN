import { LineChart } from '@mui/x-charts/LineChart';

export default function BasicArea() {
    return (
        <LineChart
            xAxis={[{ data: [1, 2, 3, 5, 8, 10] }]}
            series={[
                {
                    data: [2, 5.5, 2, 8.5, 1.5, 5],
                    area: true,
                    color: "#7A9B6A", // classy green
                },
            ]}
            height={300}
            sx={{
                "& .MuiAreaElement-root": {
                    fill: "#7A9B6A",
                    fillOpacity: 0.25, // soft area shading
                },
                "& .MuiLineElement-root": {
                    strokeWidth: 3,
                },
            }}
        />
    );
}