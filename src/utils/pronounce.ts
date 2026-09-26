// Recorded pronunciation when the dictionary has one, otherwise the browser's own voice.
export function pronounce(word: string, url: string | undefined, lang: 'en-US' | 'en-GB') {
  if (url) return void new Audio(url).play()
  speechSynthesis.cancel()
  speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(word), { lang }))
}
