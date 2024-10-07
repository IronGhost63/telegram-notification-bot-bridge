/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const Axios = require('axios');

export default {
	async fetch(request, env, ctx) {
		const response = handleRequest( request );

		return response;
	},
};

async function sendResponse(payload, status) {
	status = status ?? 200;

	return new Response(
		JSON.stringify( payload ),
		{
			status: status,
			headers: {
				"Content-Type": "application/json",
			}
		}
	);
}

async function sendMessage( payload, api_key, chat_id ) {
	let endpoint = '';
	let data = {};

	switch ( payload.type ) {
		case 'text':
			endpoint = 'sendMessage';
			data = {
				chat_id: chat_id,
				text: payload.text,
			};

			break;
		case 'image':
			endpoint = 'sendPhoto';
			data = {
				chat_id: chat_id,
				caption: payload.text,
				photo: payload.image,
			};

			break;
		case 'file':
			endpoint = 'sendDocument';
			data = {
				chat_id: chat_id,
				caption: payload.text,
				document: payload.file,
			};
			break;
		default:
			throw new Error('invalid message type');
	}

	const api_url = `https://api.telegram.org/bot${api_key}/${endpoint}`;

	try {
		const config = {
			method: 'post',
			maxBodyLength: Infinity,
			url: api_url,
			headers: {
				'Content-Type': 'application/json'
			},
			data : JSON.stringify( data ),
		};

		const response = await Axios.request(config);

		return {
			status: response.status,
			data: response.data,
		}
	} catch ( e ) {
		throw e;
	}
}

async function handleRequest(request) {
	const body = await request.json();
	const api_key = body.api_key ?? null;
	const chat_id = body.chat_id ?? null;
	const payload = {
		type: body.file ? 'file' : body.image ? 'image' : 'text',
		text: body.text ?? null,
		image: body.image ?? null,
		file: body.file ?? null,
	}

	if ( !api_key ) {
		return sendResponse({
			status: 'error',
			message: 'Telegram Bot `api_key` is required',
		}, 400);
	}

	if ( !chat_id ) {
		return sendResponse({
			status: 'error',
			message: 'Telegram Bot `chat_id` is required',
		}, 400);
	}

	const is_url = (s) => {
    try {
      new URL(s);

      return true;
    } catch (err) {
      return false;
    }
  };

	if ( payload.image !== null && !is_url( payload.image ) ) {
		return sendResponse({
			status: 'error',
			message: '`image` must be URL',
		}, 400);
	}

	if ( !payload.text & !payload.image && !payload.file ) {
		return sendResponse({
			status: 'error',
			message: 'Payload is missing',
		}, 400);
	}

	try {
		await sendMessage(payload, api_key, chat_id);

		return sendResponse({
			status: 'success',
			message: 'done',
		});
	} catch ( e ) {
		return sendResponse({
			status: e.response.status,
			message: e.response.data.description,
		});
	}
}
