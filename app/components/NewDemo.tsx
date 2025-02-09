"use client";
import Image from "next/image";
import { Search, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const SearchResult = ({
  image,
  time,
  title,
  details,
}: {
  image: React.ReactNode;
  time?: string;
  title: string;
  details: string;
}) => (
  <div className="flex gap-4 mt-6">
    <div className="basis-12 shrink-0">{image}</div>
    <div>
      <a
        href="/"
        className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
      >
        {title}
      </a>
      {time && <p className="text-gray-700 mb-2">{time}</p>}
      <p>{details}</p>
    </div>
  </div>
);

const useTypedQuery = (
  fullQuery: string,
  active: boolean = true,
  delay: number = 50
) => {
  const [typedQuery, setTypedQuery] = useState("");
  const [typingComplete, setTypingComplete] = useState(false);

  useEffect(() => {
    if (!active) return;

    let index = 0;
    const interval = setInterval(() => {
      setTypedQuery(fullQuery.slice(0, index + 1));
      index++;
      if (index === fullQuery.length) {
        clearInterval(interval);
        setTypingComplete(true);
      }
    }, delay);
    return () => clearInterval(interval);
  }, [fullQuery, active]);

  return { typedQuery, typingComplete };
};

const SearchQuery = "What's the latest on 1024 Main St?";

const AssistantContent = `
A developer submitted an application on January 15, for a
3-story, 6-unit building in an R-3 zoning district within a
flood zone, with the required fee paid. On May 20, John Doe
requested clarification on the setback requirements. The project is
scheduled for a public hearing on September 1, where an
environmental impact report will be discussed. The site is
identified in GIS data as being in a flood zone, which may impact
planning and approval considerations.
`;

export const NewDemo = () => {
  const [delayDone, setDelayDone] = useState(false);

  const { typedQuery, typingComplete } = useTypedQuery(SearchQuery);
  const { typedQuery: typedAssistantContent } = useTypedQuery(
    AssistantContent,
    delayDone,
    10
  );

  useEffect(() => {
    if (!typingComplete || delayDone) return;

    const delay = setTimeout(() => {
      setDelayDone(true);
    }, 500);
    return () => clearTimeout(delay);
  }, [typingComplete]);

  return (
    <section className="max-w-5xl mx-auto p-8">
      <div className="w-full bg-white shadow rounded-lg p-8 relative">
        <div className="rounded-2xl border p-3 flex gap-4">
          <div>
            <Search size={22} />
          </div>
          <div>{typedQuery}</div>
        </div>
        {typingComplete && !delayDone && (
          <div className="absolute inset-0 flex justify-center">
            <div className="mt-36 w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <div className={delayDone ? undefined : "invisible"}>
          <div className="mt-6 mb-4 ml-1">
            <div className="flex gap-2">
              <div>
                <Sparkles size={18} className="text-blue-600 mt-1" />
              </div>
              <div className="text-lg font-bold">Assistant</div>
            </div>
            <div>{typedAssistantContent}</div>
          </div>
          <div className="w-full border" />
          <SearchResult
            image={<CalendarDays size={36} />}
            time="September 1, 2023"
            title="Upcoming public hearing"
            details="On the agenda: environmental impact report. The meeting will take place at City Hall at 6:00 PM."
          />
          <SearchResult
            image={
              <Image
                src={"/outlook-icon.png"}
                alt="Outlook icon"
                width={40}
                height={40}
              />
            }
            time="May 20, 2023"
            title="Clarification request from developer"
            details="John Doe asked for clarification on setback requirements. He specifically inquired about front, side, and rear yard setbacks, as well as allowable encroachments."
          />
          <SearchResult
            image={<MapPin size={36} />}
            title="GIS Data"
            details="Parcel is located in R-3 zoning district, within a flood zone."
          />
          <SearchResult
            image={
              <Image
                src={"/accela.jpeg"}
                alt="Accela icon"
                width={40}
                height={40}
              />
            }
            title="Application submitted"
            time="January 15, 2023"
            details="Application submitted for a 3-story, 6-unit building. Application fee paid."
          />
        </div>
      </div>
    </section>
  );
};
