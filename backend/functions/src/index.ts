import { initializeApp } from 'firebase-admin/app';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { defineSecret } from 'firebase-functions/params';

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

                const coasterData = {
                    name: coaster.name || '',
                    inversions: coaster.inversionsNumber || 0,
                    speed: coaster.speed || 0,
                    length: coaster.length || 0,
                    height: coaster.height || 0,
                    country: coaster.park?.country?.name?.replace('country.', '') || '',
                    manufacturer: coaster.manufacturer?.name || '',
                    seating_type: coaster.seatingType?.name || '',
                    material_type: coaster.materialType?.name || '',
                    model: coaster.model?.name || '',
                    opened_date: coaster.openingDate || '',
                    status: coaster.status?.name?.replace('status.', '') || '',
                    park_name: coaster.park?.name || '',
                    rank: coaster.rank || 0,
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


export const syncCoasterData = onSchedule(
    {
        schedule: '0 3 1 * *',
        timeZone: 'UTC',
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
