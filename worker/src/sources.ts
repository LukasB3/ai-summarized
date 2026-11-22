// The list of sources. This file is the truth; the database table mirrors it
// and adds each source's health. All addresses were checked from the server.
//
// weight: how much an outlet counts towards a story's coverage bonus.
// Community sources carry their own signal (points) and have weight 0.

export type SourceKind = 'feed' | 'hn' | 'hf_papers' | 'anthropic_news'
export type SourceCategory = 'lab' | 'press' | 'community' | 'people' | 'research' | 'releases'

export interface Source {
  id: string
  name: string
  kind: SourceKind
  url: string
  siteUrl: string
  category: SourceCategory
  weight: number
}

const feed = (id: string, name: string, category: SourceCategory, url: string, siteUrl: string, weight = 1): Source => ({
  id, name, kind: 'feed', url, siteUrl, category, weight,
})

const releases = (repo: string, name: string): Source =>
  feed(`gh-${repo.replace('/', '-').toLowerCase()}`, `${name} releases`, 'releases', `https://github.com/${repo}/releases.atom`, `https://github.com/${repo}`, 0.5)

export const SOURCES: Source[] = [
  // Labs and vendors
  { id: 'anthropic', name: 'Anthropic', kind: 'anthropic_news', url: 'https://www.anthropic.com/news', siteUrl: 'https://www.anthropic.com/news', category: 'lab', weight: 1 },
  feed('openai', 'OpenAI', 'lab', 'https://openai.com/news/rss.xml', 'https://openai.com/news'),
  feed('deepmind', 'Google DeepMind', 'lab', 'https://deepmind.google/blog/rss.xml', 'https://deepmind.google/blog'),
  feed('google-ai', 'Google AI', 'lab', 'https://blog.google/technology/ai/rss/', 'https://blog.google/technology/ai'),
  feed('google-research', 'Google Research', 'lab', 'https://research.google/blog/rss/', 'https://research.google/blog'),
  feed('mistral', 'Mistral AI', 'lab', 'https://mistral.ai/rss.xml', 'https://mistral.ai/news'),
  feed('huggingface', 'Hugging Face', 'lab', 'https://huggingface.co/blog/feed.xml', 'https://huggingface.co/blog'),
  feed('apple-ml', 'Apple Machine Learning Research', 'lab', 'https://machinelearning.apple.com/rss.xml', 'https://machinelearning.apple.com'),
  feed('nvidia', 'NVIDIA', 'lab', 'https://blogs.nvidia.com/feed/', 'https://blogs.nvidia.com'),
  feed('aws-ml', 'AWS Machine Learning', 'lab', 'https://aws.amazon.com/blogs/machine-learning/feed/', 'https://aws.amazon.com/blogs/machine-learning'),
  feed('github-ai', 'GitHub', 'lab', 'https://github.blog/ai-and-ml/feed/', 'https://github.blog/ai-and-ml'),

  // Press
  feed('verge', 'The Verge', 'press', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'https://www.theverge.com/ai-artificial-intelligence'),
  feed('techcrunch', 'TechCrunch', 'press', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'https://techcrunch.com/category/artificial-intelligence'),
  feed('ars', 'Ars Technica', 'press', 'https://arstechnica.com/ai/feed/', 'https://arstechnica.com/ai'),
  feed('mit-tr', 'MIT Technology Review', 'press', 'https://www.technologyreview.com/topic/artificial-intelligence/feed', 'https://www.technologyreview.com/topic/artificial-intelligence'),
  feed('wired', 'Wired', 'press', 'https://www.wired.com/feed/tag/ai/latest/rss', 'https://www.wired.com/tag/artificial-intelligence'),
  feed('decoder', 'The Decoder', 'press', 'https://the-decoder.com/feed/', 'https://the-decoder.com'),
  feed('marktechpost', 'MarkTechPost', 'press', 'https://www.marktechpost.com/feed/', 'https://www.marktechpost.com', 0.5),

  // Community: what practitioners pass around
  { id: 'hn', name: 'Hacker News', kind: 'hn', url: 'https://hn.algolia.com/api/v1/search_by_date', siteUrl: 'https://news.ycombinator.com', category: 'community', weight: 0 },
  feed('lobsters', 'Lobsters', 'community', 'https://lobste.rs/t/ai.rss', 'https://lobste.rs/t/ai', 0),

  // People
  feed('willison', 'Simon Willison', 'people', 'https://simonwillison.net/atom/everything/', 'https://simonwillison.net', 0.8),
  feed('import-ai', 'Import AI', 'people', 'https://importai.substack.com/feed', 'https://importai.substack.com', 0.8),
  feed('latent-space', 'Latent Space', 'people', 'https://www.latent.space/feed', 'https://www.latent.space', 0.8),
  feed('interconnects', 'Interconnects', 'people', 'https://www.interconnects.ai/feed', 'https://www.interconnects.ai', 0.8),
  feed('ahead-of-ai', 'Ahead of AI', 'people', 'https://magazine.sebastianraschka.com/feed', 'https://magazine.sebastianraschka.com', 0.8),
  feed('one-useful-thing', 'One Useful Thing', 'people', 'https://www.oneusefulthing.org/feed', 'https://www.oneusefulthing.org', 0.8),

  // Research, alignment and safety
  { id: 'hf-papers', name: 'Hugging Face Daily Papers', kind: 'hf_papers', url: 'https://huggingface.co/api/daily_papers?limit=50', siteUrl: 'https://huggingface.co/papers', category: 'research', weight: 0.8 },
  feed('alignment-forum', 'Alignment Forum', 'research', 'https://www.alignmentforum.org/feed.xml', 'https://www.alignmentforum.org', 0.8),
  feed('metr', 'METR', 'research', 'https://metr.org/feed.xml', 'https://metr.org/blog', 0.8),
  feed('redwood', 'Redwood Research', 'research', 'https://blog.redwoodresearch.org/feed', 'https://blog.redwoodresearch.org', 0.8),
  feed('ai-safety-newsletter', 'AI Safety Newsletter', 'research', 'https://newsletter.safe.ai/feed', 'https://newsletter.safe.ai', 0.8),
  feed('transformer', 'Transformer', 'press', 'https://www.transformernews.ai/feed', 'https://www.transformernews.ai', 0.8),

  // Releases of tools many people build on
  releases('anthropics/claude-code', 'Claude Code'),
  releases('openai/codex', 'Codex'),
  releases('ollama/ollama', 'Ollama'),
  releases('huggingface/transformers', 'Transformers'),
  releases('vllm-project/vllm', 'vLLM'),
  releases('langchain-ai/langgraph', 'LangGraph'),
]
