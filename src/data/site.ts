// Landing content mirrors redbull.com/in-en (read Nov 2026). Links go to the official pages.
const RB = "https://www.redbull.com/in-en";

// Official photography, loaded from Red Bull's CDN at the requested crop. Concept demo only.
export const photo = (path: string, w: number, h: number) =>
  `https://img.redbull.com/images/c_fill,g_auto,w_${w},h_${h}/q_auto,f_auto/redbullcom/${path}`;

const P = {
  symphonic: "2026/8/27/wlupzhk0lxdeymkbtymn/red-bull-symphonic-mumbai",
  wings: "2026/7/29/baxzha7fahytr1l1chmk/red-bull-wings-cup",
  licence: "2026/10/15/scwlwyffd2h2r2cbxbrk/red-bull-driving-licence-2026",
  directions: "2026/3/5/trxs7wcwidclrvw7wmxa/red-bull-directions-2026-india",
  solo: "2025/10/7/twwvak0hakngiguvtqqu/red-bull-solo-legends",
  anahat: "2026/8/11/rlojz7dh1s12m0rgtsih/anahat-singh-indian-squash-player",
  vijay: "2025/9/29/w0hkhkvssnyggtv5q2ia/vijay-dk-in-the-red-bull-64-bars-studio",
};
export const TV_IMAGE = P.licence;

export const FEATURES = [
  { img: P.symphonic, title: "Red Bull Symphonic Mumbai", kicker: "Where Bollywood finds its symphony", tag: "Music", href: `${RB}/events/red-bull-symphonic-mumbai`, tone: "#7a1038" },
  { img: P.wings, title: "Red Bull Wings Cup", kicker: "India 2026", tag: "Esports", href: `${RB}/events/red-bull-wings-cup-india-2026`, tone: "#143c8c" },
  { img: P.licence, title: "Driving Licence 2026", kicker: "Motorbike road racing", tag: "Motorsports", href: `${RB}/events`, tone: "#9a2a0c" },
  { img: P.directions, title: "Directions 2026 India", kicker: "MC battle", tag: "Music", href: `${RB}/events`, tone: "#44207a" },
  { img: P.solo, title: "Solo Legends 2026", kicker: "Registrations open", tag: "Gaming", href: `${RB}/events/red-bull-solo-legends`, tone: "#0d6a62" },
  { img: P.anahat, title: "Anahat Singh", kicker: "Junior world squash champion", tag: "Athlete", href: `${RB}/anahat-singh-junior-world-squash-champion`, tone: "#14296e" },
];

export const EVENTS = [
  { img: P.wings, date: "15 Nov 2026", name: "Red Bull Wings Cup", place: "India", kind: "Esports", status: "Upcoming event", href: `${RB}/events/red-bull-wings-cup-india-2026` },
  { img: P.symphonic, date: "5 Dec 2026", name: "Red Bull Symphonic Mumbai", place: "DOME SVP Stadium, Mumbai", kind: "Music", status: "Tickets available", href: `${RB}/events/red-bull-symphonic-mumbai` },
  { img: P.solo, date: "2 Sep to 3 Dec 2026", name: "Red Bull Solo Legends 2026", place: "India", kind: "Gaming", status: "Registrations open", href: `${RB}/events/red-bull-solo-legends` },
];

export const STORIES = [
  { title: "What is Red Bull 64 Bars?", tag: "Music", read: "2 min", href: `${RB}/what-is-red-bull-64-bars`, img: P.vijay },
  { title: "Sandro Dias breaks two world records on the biggest skate ramp ever", tag: "Skateboarding", read: "6 min", href: `${RB}/sandro-dias-ultimate-skate-ramp` },
  { title: "B-Girl Bar-B's road to Red Bull BC One World Final Tokyo", tag: "Breaking", read: "5 min", href: `${RB}/red-bull-bc-one-cypher-india-2025-winner-b-girl-bar-b` },
  { title: "Lyrics to '43 Ki Hawa' by Vijay DK x Karan Kanchan", tag: "Music", read: "3 min", href: `${RB}/red-bull-64-bars-vijay-dk-karan-kanchan-43-ki-hawa-lyrics` },
  { title: "B-Boy Flying Machine: Breaking records with Red Bull BC One India wins", tag: "Breaking", read: "5 min", href: `${RB}/red-bull-bc-one-cypher-india-2025-winner-b-boy-flying-machine` },
];

const ATHLETE_LIST = `${RB}/athletes`;
export const ATHLETES = [
  { img: "2019/05/29/97344eb1-a72a-414a-8c61-148ae6f57d4b/kl-rahul-opening-batter-cricket-red-bull-athlete", name: "KL Rahul", sport: "Cricket", href: `${RB}/athlete/rahul-k.l` },
  { img: "2023/6/20/zsf1upnplnp90ps1uhfi/lakshya-sen", name: "Lakshya Sen", sport: "Badminton", href: `${RB}/athlete/lakshya-sen` },
  { img: "2021/12/27/dziqb9t76gn7as1z1mpx/indian-cricket-player-riyan-parag", name: "Riyan Parag", sport: "Cricket", href: ATHLETE_LIST },
  { img: "2025/1/2/vaifuqda8u5x8ohtc0f6/noah-harith-dakar-rally-2025-portrait", name: "Harith Noah", sport: "Rally Raid", href: ATHLETE_LIST },
  { img: "2024/4/22/f9cpbt3zruoeogcapoyf/lalremsiami", name: "Lalremsiami", sport: "Hockey", href: ATHLETE_LIST },
  { img: "2024/4/22/kxejaicpi8tjdwvnrsar/jonathan-gaming", name: "Jonathan Amaral", sport: "Gaming", href: ATHLETE_LIST },
  { img: "2022/5/2/npvlsw7mfijeaefskwaj/ujjwal-chaurasia-techno-gamerz", name: "Techno Gamerz", sport: "Gaming", href: ATHLETE_LIST },
  { img: "2020/7/17/ly2m5q8ycqwev85vbw3h/ankit-v3nom-panth", name: "Ankit Panth", sport: "Gaming", href: ATHLETE_LIST },
];

export const TV = [
  { name: "Discover", href: "https://www.redbull.tv" },
  { name: "On Now", href: "https://www.redbull.tv/en_IN/epg" },
  { name: "Live Events", href: "https://www.redbull.tv/en_IN/events" },
];

export const WORLD = [
  ["Symphonic Mumbai", "Music"],
  ["Wings Cup", "Esports"],
  ["Driving Licence 2026", "Road racing"],
  ["Directions 2026 India", "MC battle"],
  ["Solo Legends 2026", "Games"],
  ["The Maestro Game", "Music"],
  ["Turn It Up 2026", "Music"],
  ["Bhangra Brrrawl 2026", "Dance"],
  ["Half Court Maldives 2026", "Basketball"],
  ["Vallam Vali 2026", "Kayaking"],
  ["Road Gap India 2026", "Skateboarding"],
];

export const COMPANY = [
  { name: "Manpreet Singh", sport: "Field hockey", img: "2021/4/12/y7iydo1qztgx91i4j6qk/manpreet-singh-indian-hockey-team-captain-red-bull-athlete" },
  { name: "CS Santosh", sport: "Motorsports", img: "2019/12/31/cd1mtczpuhlmhrfnqhbt/cs-santosh-rally-raid-motocross-red-bull-athlete" },
  { name: "KL Rahul", sport: "Cricket", img: "2020/4/18/ivbout560dt6462b1ccg/kl-rahul-indian-cricket-batsman-opener-red-bull-athlete" },
];
