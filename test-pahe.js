async function main() {
  const res = await globalThis.fetch('https://animepahe.ru/?s=naruto', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html'
    }
  });
  const html = await res.text();
  console.log('Status:', res.status);
  // Print the first 2000 chars to see what's there
  console.log(html.substring(0, 2000));
}
main().catch(console.error);
