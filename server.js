import cors from 'cors';
import dns from 'dns';
import dotenv from 'dotenv';
import express, { urlencoded } from 'express';
import mongoose from 'mongoose';
import url from 'url';
import { nanoid } from 'nanoid';

dotenv.config();
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(
	'mongodb+srv://cluster0.mtrwe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
	{
		user: process.env.MONGO_USER,
		pass: process.env.MONGO_PASSWORD,
		useNewUrlParser: true,
		useUnifiedTopology: true
	},
	(e) => {
		console.log(e);
	}
);

const urlSchema = new mongoose.Schema({
	original_url: String,
	short_url: String
});

const URL = mongoose.model('URL', urlSchema);

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// Get the post params
app.use(urlencoded({ extended: true }));

app.get('/', (req, res) => {
	res.sendFile(process.cwd() + '/views/index.html');
});

// Make sure that url is valid
app.post('/api/shorturl', (req, res, next) => {
	try {
		const parsed = new url.URL(req.body.url);

		if (!parsed.protocol || !['http:', 'https:'].includes(parsed.protocol)) {
			throw Error('Invalid URL');
		}

		dns.lookup(parsed.hostname, (err, address) => {
			if (!err) {
				next();
			}
			else {
				throw Error('Invalid URL');
			}
		});
	} catch (err) {
		res.status(422).json({
			error: 'invalid url'
		});
	}

})

app.post('/api/shorturl', async (req, res) => {
	try {
		let url = await URL.findOne({ original_url: req.body.url });
		if (!url) {
			url = new URL({
				original_url: req.body.url,
				short_url: nanoid(10)
			});

			await url.save();
		}

		res.json({
			original_url: url.original_url,
			short_url: url.short_url
		});
	}
	catch (e) {
		res.status(500).json({
			message: 'There was a problem'
		})
	}
});

app.get(['/api/shorturl/:short_url', '/:short_url'], async (req, res) => {
	try {
		const url = await URL.findOne({ short_url: req.params.short_url });

		res.redirect(url.original_url);
	}
	catch (e) {
		res.status(500).json({
			message: 'There was a problem'
		})
	}
});

app.get('/api/all', async (req, res) => {
	const urls = await URL.find();

	res.json(
		urls
	);
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
