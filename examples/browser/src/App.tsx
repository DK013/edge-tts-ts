import { useState, useEffect } from "react";
import { Communicate, VoicesManager, Voice } from "edge-tts-ts";

export default function App() {
	const [text, setText] = useState("Hello from Microsoft Edge TTS!");
	const [voices, setVoices] = useState<Voice[]>([]);
	const [selectedVoice, setSelectedVoice] = useState(
		"en-US-EmmaMultilingualNeural",
	);
	const [rate, setRate] = useState(0);
	const [volume, setVolume] = useState(0);
	const [pitch, setPitch] = useState(0);
	const [loading, setLoading] = useState(false);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		async function fetchVoices() {
			try {
				const manager = await VoicesManager.create();
				setVoices(manager.voices);
			} catch (err) {
				console.error("Failed to fetch voices:", err);
			}
		}
		fetchVoices();
	}, []);

	const handleSynthesize = async () => {
		setLoading(true);
		try {
			const rateStr = `${rate >= 0 ? "+" : ""}${rate}%`;
			const volumeStr = `${volume >= 0 ? "+" : ""}${volume}%`;
			const pitchStr = `${pitch >= 0 ? "+" : ""}${pitch}Hz`;

			const comm = new Communicate(text, {
				voice: selectedVoice,
				rate: rateStr,
				volume: volumeStr,
				pitch: pitchStr,
			});

			const chunks: Uint8Array[] = [];
			for await (const chunk of comm.stream()) {
				if (chunk.type === "audio") {
					chunks.push(chunk.data);
				}
			}

			const blob = new Blob(chunks as any[], { type: "audio/mpeg" });
			const url = URL.createObjectURL(blob);
			const audio = new Audio();

			setPlaying(true);
			audio.onended = () => {
				setPlaying(false);
				URL.revokeObjectURL(url);
			};
			audio.onerror = (e) => {
				console.error("Playback error:", e);
				setPlaying(false);
				URL.revokeObjectURL(url);
			};
			audio.src = url;
			await audio.play();
		} catch (err) {
			console.error(err);
			alert("Error during synthesis: " + (err as Error).message);
			setPlaying(false);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen p-8 max-w-4xl mx-auto">
			<header className="mb-8">
				<h1 className="text-3xl font-bold text-blue-600">Edge TTS JS</h1>
				<p className="text-gray-500">Browser-ready Text-to-Speech example</p>
			</header>

			<div className="bg-white p-6 rounded-lg shadow-md space-y-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Text to Synthesize
					</label>
					<textarea
						className="w-full p-3 border rounded-md h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Type something here..."
					></textarea>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Voice
							</label>
							<select
								className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-10"
								value={selectedVoice}
								onChange={(e) => setSelectedVoice(e.target.value)}
							>
								{voices.length === 0 && <option>Loading voices...</option>}
								{voices.map((v) => (
									<option key={v.ShortName} value={v.ShortName}>
										{v.FriendlyName} ({v.Locale})
									</option>
								))}
							</select>
						</div>
						<div className="p-4 bg-blue-50 rounded-md border border-blue-100">
							<p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">
								Selected Voice Info
							</p>
							<p className="text-sm text-gray-700 font-semibold">
								{voices.find((v) => v.ShortName === selectedVoice)
									?.FriendlyName || selectedVoice}
							</p>
							<p className="text-xs text-gray-500">
								{voices.find((v) => v.ShortName === selectedVoice)?.Locale ||
									"Unknown Locale"}
							</p>
						</div>
					</div>

					<div className="space-y-4">
						<div>
							<label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
								<span>Rate</span>
								<span className="text-blue-600 font-mono font-bold">
									{rate >= 0 ? "+" : ""}
									{rate}%
								</span>
							</label>
							<input
								type="range"
								min="-100"
								max="100"
								value={rate}
								onChange={(e) => setRate(parseInt(e.target.value))}
								className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
							/>
						</div>

						<div>
							<label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
								<span>Volume</span>
								<span className="text-blue-600 font-mono font-bold">
									{volume >= 0 ? "+" : ""}
									{volume}%
								</span>
							</label>
							<input
								type="range"
								min="-100"
								max="100"
								value={volume}
								onChange={(e) => setVolume(parseInt(e.target.value))}
								className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
							/>
						</div>

						<div>
							<label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
								<span>Pitch</span>
								<span className="text-blue-600 font-mono font-bold">
									{pitch >= 0 ? "+" : ""}
									{pitch}Hz
								</span>
							</label>
							<input
								type="range"
								min="-100"
								max="100"
								value={pitch}
								onChange={(e) => setPitch(parseInt(e.target.value))}
								className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
							/>
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<button
						onClick={handleSynthesize}
						disabled={loading || playing || voices.length === 0}
						className={`px-8 py-3 rounded-md font-bold text-white transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
							loading || playing || voices.length === 0
								? "bg-gray-400 cursor-not-allowed"
								: "bg-blue-600 hover:bg-blue-700"
						}`}
					>
						{(loading || playing) && (
							<svg
								className="animate-spin h-5 w-5 text-white"
								xmlns="http://www.w3.org/2000/10/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						)}
						{loading
							? "Synthesizing..."
							: playing
								? "Playing..."
								: "Play / Synthesize"}
					</button>
				</div>
			</div>

			<footer className="mt-12 text-center text-gray-400 text-sm">
				Built with edge-tts-ts, React, and Tailwind CSS.
			</footer>
		</div>
	);
}
