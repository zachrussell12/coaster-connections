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

interface ConnectionObject {
    quality: string,
    operator: WhereFilterOp,
    value: Array<string | number>,
    category: string,
    explanation: string,
}

interface FinalConnectionObject {
    quality: string,
    operator: WhereFilterOp,
    value: string | number,
    category: string,
    explanation: string,
}

interface PuzzleObject {
    coaster_objects: CoasterPuzzleObject[],
    correct_connections: ConnectionsSolutionObject[],
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

function getRandomConnections(): ConnectionObject[] {
    const shuffledConnections = [...connectionTypes].sort(() => 0.5 - Math.random())
    return shuffledConnections.slice(0, 4)
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

        const connections = getRandomConnections();
        let puzzle: PuzzleObject = { coaster_objects: [], correct_connections: [] };
        let usedCoasters = new Set<string>();

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
            };

            const connection_solution: ConnectionsSolutionObject = {
                name_sequence: coastersSequenceSolution,
                connections_object: finalConnectionObject,
            };

            puzzle.correct_connections.push(connection_solution);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

        const docRef = db.collection('daily_puzzles').doc(timestamp);

        await docRef.create(puzzle);

        console.log("Created new daily puzzle for: ", timestamp)

    }
)
