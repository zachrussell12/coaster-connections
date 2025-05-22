import { initializeApp } from 'firebase-admin/app';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { defineSecret } from 'firebase-functions/params';
import { connectionTypes } from './puzzleConstants';
import { DocumentData, QueryDocumentSnapshot, WhereFilterOp } from 'firebase-admin/firestore';

initializeApp();
const db = admin.firestore();

const API_BASE_URL = 'https://captaincoaster.com';
const CAPTAINCOASTER_API_KEY = defineSecret('CAPTAINCOASTER_API_KEY');

const categoryColors = ["#c685ff", "#44d491", "#ffdc59", "#7dadff"]

async function fetchAllCoasterIds(API_KEY: string): Promise<string[]> {
    let coasters: any[] = [];
    let nextPageUrl = `${API_BASE_URL}/api/coasters?order%5Bid%5D=asc&order%5Brank%5D=asc&rank%5Bbetween%5D=0..250`;
    let morePages = true;

    while (morePages) {
        console.log("Fetching all coaster IDs...")
        const response = await axios.get(nextPageUrl, {
            headers: { Authorization: `Bearer ${API_KEY}` },
        });

        const data: any = response.data;
        coasters = coasters.concat(data.member);

        const nextView = data.view?.next;
        morePages = !!nextView;
        if (morePages) {
            nextPageUrl = `${API_BASE_URL}${nextView}`;
        }
    }

    return coasters.map((coaster) => coaster.id.toString());
}

interface LaunchObject {
    id: string,
    type: string,
    name: string
}

interface ViableCategory {
    category: ConnectionObject,
    value: string | number,
    coasters: QueryDocumentSnapshot[],
}

interface ConnectionObject {
    quality: string,
    operator: WhereFilterOp,
    opposite: WhereFilterOp | string,
    value: Array<string | number>,
    category: string,
    explanation: string,
}

interface FinalConnectionObject {
    quality: string,
    operator: WhereFilterOp,
    opposite: WhereFilterOp | string,
    value: string | number,
    category: string,
    explanation: string,
    categoryColor: string,
}

interface PuzzleObject {
    coaster_objects: CoasterPuzzleObject[],
    correct_connections: ConnectionsSolutionObject[],
    puzzle_number: number,
}

interface CoasterPuzzleObject {
    name: string,
    imageURL: string,
    country: string,
    height: number,
    inversions: string,
    launch_types: string[],
    length: number,
    manufacturer: string,
    material_type: string,
    model: string,
    opened_year: number,
    park_name: number,
    restraint_type: string,
    seating_type: string,
    speed: number,
}

interface ConnectionsSolutionObject {
    name_sequence: string[],
    connections_object: FinalConnectionObject
}

async function fetchCoasterDetailsInBatches(
    coasterIds: string[],
    batchSize = 20,
    API_KEY: string,
    delayMs = 200
) {
    let batch = db.batch();
    let batchCount = 0;

    for (let i = 0; i < coasterIds.length; i += batchSize) {
        const batchIds = coasterIds.slice(i, i + batchSize);

        for (const id of batchIds) {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/coasters/${id}`, {
                    headers: { Authorization: `Bearer ${API_KEY}` },
                });

                const coaster = response.data;
                console.log(`Fetched info about ${coaster.name}`);

                const coasterId = coaster.id?.toString();
                let launchType: string[] = [];

                if (coaster.launchs && coaster.launchs.length > 0) {
                    launchType = coaster.launchs.map((l: LaunchObject) => capitalize(l.name.replace('launch.', '').replace('.', ' ')))
                }

                const imagePath = coaster.mainImage?.path || '';
                const imageURL = imagePath ? `https://pictures.captaincoaster.com/280x210/${imagePath}` : ''

                const coasterData = {
                    name: coaster.name || 'Name Unknown',
                    image: imageURL,
                    inversions: coaster.inversionsNumber || 'Unknown',
                    speed: coaster.speed || 'Unknown',
                    length: coaster.length || 'Unknown',
                    height: coaster.height || 'Unknown',
                    country: coaster.park?.country?.name?.replace('country.', '') || 'Unknown',
                    manufacturer: coaster.manufacturer?.name || 'Unknown',
                    seating_type: coaster.seatingType?.name || 'Unknown',
                    material_type: coaster.materialType?.name || 'Unknown',
                    launch_type: launchType,
                    restraint_type: coaster.restraint
                        ? capitalize(coaster.restraint.name.replace('restraint.', '').replace('.', ' '))
                        : 'Unknown',
                    model: coaster.model?.name || 'Unknown',
                    opened_year: coaster.openingDate.split('-')[0] || 'Unknown',
                    status: coaster.status?.name?.replace('status.', '') || 'Unknown',
                    park_name: coaster.park?.name || 'Unknown',
                    rank: coaster.rank || 'Unknown',
                    last_synced: admin.firestore.FieldValue.serverTimestamp(),
                };


                const docRef = db.collection('coasters').doc(coasterId);
                batch.set(docRef, coasterData);
                batchCount++;

                if (batchCount === 500) {
                    await batch.commit();
                    console.log(`Committed batch of 500.`);
                    batch = db.batch();
                    batchCount = 0;
                }

            } catch (error) {
                console.warn(`Failed to fetch coaster ${id}: ${error}`);
            }

            if (id !== batchIds[batchIds.length - 1]) {
                await delay(delayMs);
            }
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount}.`);
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function getRandomCategory(usedCategories: FinalConnectionObject[]): ConnectionObject {
    const remainingCategories = connectionTypes.filter(cat => 
        !usedCategories.some(used => used.category === cat.category)
    );

    if (remainingCategories.length === 0) {
        throw new Error("No remaining categories available.");
    }

    const randomIndex = Math.floor(Math.random() * remainingCategories.length);
    return remainingCategories[randomIndex];
}


async function findViableCoasterSet(
    currCategory: ConnectionObject,
    value: string | number,
    querySet: FinalConnectionObject[],
    usedCoasters: Set<string>,
    recursionDepth: number
): Promise<ViableCategory | null> {

    if (recursionDepth >= 500) {
        console.warn("Max recursion depth reached. Aborting search.");
        return null;
    }

    const snapshot = await db.collection('coasters')
        .where(currCategory.quality, currCategory.operator, value)
        .get();

    console.log(`Initial snapshot size for category ${currCategory.category}:`, snapshot.size);

    let availableCoasters = snapshot.docs.filter(doc => !usedCoasters.has(doc.data().name));

    console.log(`Filtering against ${querySet.length} existing category constraints`);

    availableCoasters = availableCoasters.filter(doc => {
        const data = doc.data();

        if (querySet.length === 0) return true;

        return querySet.every(category => {
            const fieldValue = data[category.quality];

            if (category.opposite === "array-does-not-contain") {
                return !Array.isArray(fieldValue) || !fieldValue.includes(category.value);
            }

            switch (category.opposite) {
                case "!=": return fieldValue !== category.value;
                case "<=": return fieldValue <= category.value;
                case ">=": return fieldValue >= category.value;
                case "array-contains": return Array.isArray(fieldValue) && fieldValue.includes(category.value);
                default: return true;
            }
        });
    });

    if (availableCoasters.length >= 4) {
        console.log("FOUND VIABLE NUMBER OF COASTERS FOR CATEGORY")
        const solution = selectRandomSolutionSet(availableCoasters);
        return { category: currCategory, value, coasters: solution };
    } else {
        console.log(`${currCategory.category} failed to produce a viable set with recursion depth: ${recursionDepth}`);

        const newCategory = getRandomCategory(querySet);
        const randomValue = newCategory.value[Math.floor(Math.random() * newCategory.value.length)];

        return findViableCoasterSet(newCategory, randomValue, querySet, usedCoasters, recursionDepth + 1);
    }
}

function selectRandomSolutionSet(snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>[]): QueryDocumentSnapshot[] {
    const shuffledCoasters = [...snapshot].sort(() => 0.5 - Math.random())
    return shuffledCoasters.slice(0, 4)
}

export const syncCoasterData = onSchedule(
    {
        schedule: '0 3 1 * *',
        timeZone: 'America/New_York',
        secrets: [CAPTAINCOASTER_API_KEY],
    },
    async () => {
        try {
            const API_KEY = process.env.CAPTAINCOASTER_API_KEY;
            if (!API_KEY) throw new Error('API Key is missing.');

            console.log('Starting Coaster Stat Sync Job...');

            const existingCoastersSnapshot = await db.collection('coasters').get();
            const existingCoasterIds = new Set<string>();
            existingCoastersSnapshot.forEach((doc) => {
                existingCoasterIds.add(doc.id);
            });

            const coasters = await fetchAllCoasterIds(API_KEY);

            const newCoasterIds = coasters.filter((id) => !existingCoasterIds.has(id));

            await fetchCoasterDetailsInBatches(newCoasterIds, 20, API_KEY);

            console.log(`Coaster Sync Complete. The database is up to date!`);

        } catch (error) {
            console.error('Error syncing coasters:', error);
            throw new Error('Coaster Sync Failed');
        }
    }
);

export const generateDailyPuzzle = onSchedule(
    {
        schedule: '0 6 * * *',
        timeZone: 'America/New_York',
        secrets: [CAPTAINCOASTER_API_KEY],
    },
    async () => {

        console.log("Creating new puzzle...")

        const numOfPuzzles = (await db.collection('daily_puzzles').count().get()).data().count;
        let puzzle: PuzzleObject = { coaster_objects: [], correct_connections: [], puzzle_number: numOfPuzzles + 1 };
        let usedCoasters = new Set<string>();
        let usedCategories: FinalConnectionObject[] = [];
        let overallAttempts = 0;

        for (var i = 0; i < 4; i++) {

            const category: ConnectionObject = getRandomCategory(usedCategories);

            const randomConnectionValue = category.value[Math.floor(Math.random() * category.value.length)];

            const viableCat: ViableCategory | null = await findViableCoasterSet(category, randomConnectionValue, usedCategories, usedCoasters, 0);

            if (viableCat) {

                const coastersSequenceSolution: string[] = [];

                viableCat.coasters.forEach(coaster => {
                    const data = coaster.data();
                    puzzle.coaster_objects.push({ name: data.name, imageURL: data.image, country: data.country, height: data.height, inversions: data.inversions, launch_types: data.launch_type, length: data.length, manufacturer: data.manufacturer, material_type: data.material_type, model: data.model, opened_year: data.opened_year, park_name: data.park_name, restraint_type: data.restraint_type, seating_type: data.seating_type, speed: data.speed, });
                    usedCoasters.add(data.name);
                    coastersSequenceSolution.push(data.name);
                });

                const finalConnectionObject: FinalConnectionObject = {
                    quality: viableCat.category.quality,
                    operator: viableCat.category.operator,
                    opposite: viableCat.category.opposite,
                    value: viableCat.value,
                    category: viableCat.category.category,
                    explanation: viableCat.category.explanation,
                    categoryColor: categoryColors[i],
                };

                usedCategories.push(finalConnectionObject);

                const connection_solution: ConnectionsSolutionObject = {
                    name_sequence: coastersSequenceSolution,
                    connections_object: finalConnectionObject,
                };

                puzzle.correct_connections.push(connection_solution);
            }
            else {
                if (overallAttempts >= 50) {
                    break;
                }
                else {
                    i--;
                }
            }

        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

        const docRef = db.collection('daily_puzzles').doc(timestamp);

        await docRef.create(puzzle);

        console.log("Created new daily puzzle for: ", timestamp)

    }
)


/* OLD PUZZLE GENERATION METHOD

const connections = getRandomConnections();
        let puzzle: PuzzleObject = { coaster_objects: [], correct_connections: [], puzzle_number: numOfPuzzles+1};
        let usedCoasters = new Set<string>();
        let i = 0;

        for (const connectionPuzzle of connections) {
            let solution: QueryDocumentSnapshot[] = [];
            let retries = 0;
            let randomConnectionValue: string | number = '';

            while (solution.length < 4 && retries < 10) {
                randomConnectionValue = connectionPuzzle.value[Math.floor(Math.random() * connectionPuzzle.value.length)];

                const query = db.collection('coasters').where(
                    connectionPuzzle.quality,
                    connectionPuzzle.operator,
                    randomConnectionValue
                );

                const snapshot = await query.get();

                const availableCoasters = snapshot.docs.filter(doc => !usedCoasters.has(doc.data().name));

                if (availableCoasters.length >= 4) {
                    solution = selectRandomSolutionSet(availableCoasters);
                    break;
                }

                retries++;
            }

            if (solution.length < 4) {
                console.warn(`Skipping connection ${connectionPuzzle.category} — not enough unique coasters.`);
                continue;
            }

            const coastersSequenceSolution: string[] = [];

            solution.forEach(coaster => {
                const data = coaster.data();
                puzzle.coaster_objects.push({name: data.name, imageURL: data.image, country: data.country, height: data.height, inversions: data.inversions, launch_types: data.launch_type, length: data.length, manufacturer: data.manufacturer, material_type: data.material_type, model: data.model, opened_year: data.opened_year, park_name: data.park_name, restraint_type: data.restraint_type, seating_type: data.seating_type, speed: data.speed,});
                usedCoasters.add(data.name);
                coastersSequenceSolution.push(data.name);
            });

            const finalConnectionObject: FinalConnectionObject = {
                quality: connectionPuzzle.quality,
                operator: connectionPuzzle.operator,
                value: randomConnectionValue,
                category: connectionPuzzle.category,
                explanation: connectionPuzzle.explanation,
                categoryColor: categoryColors[i],
            };

            const connection_solution: ConnectionsSolutionObject = {
                name_sequence: coastersSequenceSolution,
                connections_object: finalConnectionObject,
            };

            puzzle.correct_connections.push(connection_solution);
            i++;
        }
*/