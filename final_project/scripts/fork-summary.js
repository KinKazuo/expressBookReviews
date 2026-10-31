// Keep the actual GitHub API response fields relevant to the fork requirement.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  const repo = JSON.parse(input);
  if (!repo.fork || !repo.parent) throw new Error('The repository is not a GitHub fork');
  console.log(JSON.stringify({
    full_name: repo.full_name,
    html_url: repo.html_url,
    fork: repo.fork,
    parent: { full_name: repo.parent.full_name, html_url: repo.parent.html_url },
    source: { full_name: repo.source.full_name, html_url: repo.source.html_url },
  }, null, 2));
});
