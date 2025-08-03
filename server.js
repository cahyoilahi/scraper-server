const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3001; // Port yang disediakan oleh Render

app.use(cors());
app.use(express.json());

// --- FUNGSI-FUNGSI SCRAPER (Sama seperti sebelumnya) ---

async function scrapeInstagramStats(username) {
    if (!username) return { followers: 0 };
    const url = `https://www.instagram.com/${username}/`;
    try {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' };
        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);
        let followersCount = 0;
        $('script[type="application/ld+json"]').each((i, el) => {
            const scriptContent = $(el).html();
            if (scriptContent) {
                try {
                    const jsonData = JSON.parse(scriptContent);
                    if (jsonData.mainEntityofPage?.interactionStatistic) {
                        const followerStat = jsonData.mainEntityofPage.interactionStatistic.find(s => s.interactionType === 'http://schema.org/FollowAction');
                        if (followerStat) followersCount = parseInt(followerStat.userInteractionCount, 10);
                    }
                } catch (e) {}
            }
        });
        return { followers: followersCount };
    } catch (error) {
        console.error(`Gagal scrape Instagram untuk ${username}:`, error.message);
        return { followers: 0 };
    }
}

// ... (Anda bisa menambahkan fungsi scraper untuk X dan TikTok di sini dengan cara yang sama)

// --- API ENDPOINT ---
// Ini adalah "pintu" yang akan dipanggil oleh Firebase Cloud Function

app.post('/scrape', async (req, res) => {
    const { instagram, x, tiktok } = req.body;

    console.log("Menerima permintaan scrape untuk:", { instagram, x, tiktok });

    if (!instagram && !x && !tiktok) {
        return res.status(400).json({ error: 'Tidak ada username yang diberikan.' });
    }

    try {
        // Panggil semua scraper secara bersamaan
        const [igData /*, xData, tiktokData*/] = await Promise.all([
            scrapeInstagramStats(instagram),
            // scrapeXStats(x),
            // scrapeTikTokStats(tiktok)
        ]);

        const result = {
            instagram: igData,
            // x: xData,
            // tiktok: tiktokData
        };

        console.log("Mengirim hasil scrape:", result);
        res.status(200).json(result);

    } catch (error) {
        console.error("Terjadi error di server scraper:", error);
        res.status(500).json({ error: 'Gagal melakukan scraping.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server scraper berjalan di port ${PORT}`);
});