import GraphCard from "../components/Cards/GraphCard";
import HighHeaders from "../components/Cards/HighHeaders";
import HeaderNav from "../components/Navbar/HeaderNav";
import VerticalNav from "../components/Navbar/VerticalNav";

const cards = [
  { name: 'Unstable Sector', points: 72, tagScore: 'High Risk', sentence: 'Sector showing volatile movement' },
  { name: 'Unstable Company', points: 58, tagScore: 'Medium Risk', sentence: 'Company cash flow irregular' },
  { name: 'Environment Risk', points: 45, tagScore: 'Low Risk', sentence: 'Macro environment under pressure' },
];

export default function Home() {
  return (
    <div className="h-screen flex flex-col">

      <HeaderNav />

      <div className="flex flex-1 overflow-hidden">

        <VerticalNav />

        <div className="flex-1 bg-[#EAE9E3] px-6 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {cards.map((c) => (
              <HighHeaders key={c.name} name={c.name} points={c.points} tagScore={c.tagScore} sentence={c.sentence} />
            ))}
          </div>
          <GraphCard title="Risk Trend Overview" subtitle="Sector · Company · Environment" />
        </div>

      </div>

    </div>
  );
}
