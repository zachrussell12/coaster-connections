import { WhereFilterOp } from 'firebase-admin/firestore';

interface ConnectionObject{
    quality: string,
    operator: WhereFilterOp,
    value: Array<string | number>,
    category: string,
    explanation: string,
}

const manufacturers: string[] = [
    "Great Coasters International",
    "Bolliger & Mabillard",
    "Custom Coasters International, Inc.",
    "Intamin",
    "Gravity Group",
    "Gerstlauer",
    "Mack Rides",
    "S&S Sansei Technologies",
    "Vekoma",
    "Premier Rides",
    "Rocky Mountain Construction",
    "Morgan"
]

const park_names : string[] = [
    "Hersheypark",
    "Kings Dominion",
    "Universal Islands of Adventure",
    "Kings Island",
    "Europa Park",
    "Six Flags Great Adventure",
    "Fuji-Q Highland",
    "Cedar Point",
    "Busch Gardens Tampa",
    "Six Flags Magic Mountain",
    "Carowinds",
    "Silver Dollar City",
    "Busch Gardens Williamsburg",
    "Knott's Berry Farm",
    "Energylandia",
    "Parque Warner Madrid"
]

const countries : string[] = [        
    "usa",
    "netherlands",
    "southkorea",
    "canada",
    "denmark",
    "china",
    "japan",
    "italy",
    "germany",
    "uae",
    "france",
    "uk",
    "spain",
    "sweden",
    "poland",
    "belgium"
]

const seating_types : string[] = [
    "Sit Down",
    "Inverted",
    "Floorless",
    "Flying",
    "Wing"
]

const model_types : string[] = [
    "GCI Wooden Coasters",
    "B&M Inverted Coaster",
    "B&M Hyper Coaster",
    "B&M Dive Coaster",
    "B&M Floorless Coaster",
    "Intamin Wooden Coaster (Prefabricated Track)",
    "B&M Flying Coaster",
    "Intamin LSM Launch Coaster",
    "Mack Launch Coaster",
    "Intamin Accelerator Coaster",
    "B&M Wing Coaster",
    "B&M Sitting Coaster",
    "Intamin Mega Coaster",
    "Gerstlauer Infinity Coaster",
    "RMC Topper Track",
    "Mack Hypercoaster",
    "RMC IBox Track",
    "RMC Raptor Track"
]

const launch_types: string[] = [
    "Lift chain",
    "Lift cable",
    "Lim",
    "Hydraulic",
    "Air",
    "Tire"
]

const restraint_types: string[] = [
    "Lap",
    "Shoulder",
    "Flying",
    "Vest"
]

export const connectionTypes : ConnectionObject[] = [
    {
        quality: "material_type",
        operator: "==",
        value: ["Wooden", "Steel", "Hybrid"],
        category: "Material Type",
        explanation: "All coasters are %replace% construction."
    },
    {
        quality: "manufacturer",
        operator: "==",
        value: manufacturers,
        category: "Manufacturer",
        explanation: "All coasters are manufactured by %replace%."
    },
    {
        quality: "park_name",
        operator: "==",
        value: park_names,
        category: "Park",
        explanation: "All coasters are found in %replace%."
    },
    {
        quality: "country",
        operator: "==",
        value: countries,
        category: "Country",
        explanation: "All coasters are located in %replace%."
    },
    {
        quality: "seating_type",
        operator: "==",
        value: seating_types,
        category: "Seating Type",
        explanation: "All coasters have %replace% seating."
    },
    {
        quality: "model",
        operator: "==",
        value: model_types,
        category: "Model",
        explanation: "All coasters are %replace% models."
    },
    {
        quality: "launch_type",
        operator: "array-contains",
        value: launch_types,
        category: "Launch Type",
        explanation: "All coasters use a %replace% launch type."
    },
    {
        quality: "restraint_type",
        operator: "==",
        value: restraint_types,
        category: "Restraint Type",
        explanation: "All coasters use a %replace% restraint type."
    },
    {
        quality: "speed",
        operator: "<=",
        value: [75, 85],
        category: "Top Speed",
        explanation: "All coasters have a top speed lower than %replace%."
    },
    {
        quality: "speed",
        operator: ">=",
        value: [115, 125, 135, 150, 160],
        category: "Top Speed",
        explanation: "All coasters have a top speed greater than %replace%."
    },
    {
        quality: "height",
        operator: ">=",
        value: [65, 90],
        category: "Height",
        explanation: "All coasters have a height greather than %replace% meters."
    },
    {
        quality: "height",
        operator: "<=",
        value: [10, 25],
        category: "Height",
        explanation: "All coasters have a height less than %replace% meters."
    },
    {
        quality: "length",
        operator: ">=",
        value: [1250, 1500, 1750],
        category: "Length",
        explanation: "All coasters have a length greater than %replace% meters."
    },
    {
        quality: "length",
        operator: "<=",
        value: [550, 750],
        category: "Length",
        explanation: "All coasters have a length less than %replace% meters."
    },
    {
        quality: "inversions",
        operator: "==",
        value: [5, 0, 4, 2, 1, 6, 3, 7],
        category: "Inversions",
        explanation: "All coasters have %replace% inversions."
    },
]