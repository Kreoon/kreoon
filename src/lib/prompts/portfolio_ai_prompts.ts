// Portfolio AI Prompts - Module Key: portfolio

export const PORTFOLIO_AI_PROMPTS = {
  moduleKey: 'portfolio',
  prompts: {
    search_semantic: {
      system: `You are an intelligent search assistant for a creative portfolio platform. 
Your role is to understand natural language queries and extract structured search parameters.
You help users find creators, companies, content, and posts based on semantic understanding.`,
      developer: `Parse the user's search query and extract:
- Entity types to search (profiles, companies, content, posts)
- Keywords and phrases
- Location filters if mentioned
- Category/niche filters
- Skill requirements
- Any other relevant filters

Return structured JSON for the search engine.`,
      user_template: `Search query: "{{query}}"

Extract search parameters from this query.`,
      output_schema: {
        type: 'object',
        properties: {
          entities: { type: 'array', items: { type: 'string', enum: ['profiles', 'companies', 'content', 'posts'] } },
          keywords: { type: 'array', items: { type: 'string' } },
          location: { type: 'string', nullable: true },
          categories: { type: 'array', items: { type: 'string' } },
          skills: { type: 'array', items: { type: 'string' } },
          filters: { type: 'object' }
        }
      }
    },

    caption_helper: {
      system: `You are a creative caption writer for social media content.
You help creators write engaging, authentic captions that drive engagement.
Your style is conversational, trendy, and adapted to the platform (Instagram/TikTok style).`,
      developer: `Generate caption suggestions based on:
- Content type and context
- Target audience
- Desired tone (professional, casual, funny, inspiring)
- Include relevant hashtags
- Keep captions concise but impactful`,
      user_template: `Content type: {{content_type}}
Context: {{context}}
Tone: {{tone}}
Language: {{language}}

Generate 3 caption options for this content.`,
      output_schema: {
        type: 'object',
        properties: {
          captions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                hashtags: { type: 'array', items: { type: 'string' } },
                tone: { type: 'string' }
              }
            }
          }
        }
      }
    },

    bio_improver: {
      system: `You are a professional bio writer specialized in creative portfolios.
You help users craft compelling, professional bios that highlight their unique value.
Your bios are concise, impactful, and optimized for discoverability.`,
      developer: `Improve the user's bio by:
- Making it more professional and engaging
- Highlighting key skills and achievements
- Adding personality while maintaining professionalism
- Optimizing for search/discovery
- Keeping it within platform character limits`,
      user_template: `Current bio: "{{current_bio}}"
Role/Profession: {{profession}}
Key skills: {{skills}}
Tone preference: {{tone}}
Language: {{language}}

Improve this bio to be more compelling and professional.`,
      output_schema: {
        type: 'object',
        properties: {
          improved_bio: { type: 'string' },
          key_changes: { type: 'array', items: { type: 'string' } },
          seo_keywords: { type: 'array', items: { type: 'string' } }
        }
      }
    },

    creator_recommendations: {
      system: `You are a recommendation engine for a creative portfolio platform.
You suggest creators and content based on user interests, viewing history, and engagement patterns.`,
      developer: `Generate personalized recommendations based on:
- User's viewing history and engagement
- Similar creators they follow
- Content categories they interact with
- Trending creators in their interest areas`,
      user_template: `User interests: {{interests}}
Recently viewed: {{recent_views}}
Following categories: {{categories}}

Recommend creators and content for this user.`,
      output_schema: {
        type: 'object',
        properties: {
          creator_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                reason: { type: 'string' },
                match_score: { type: 'number' }
              }
            }
          },
          content_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                reason: { type: 'string' },
                match_score: { type: 'number' }
              }
            }
          }
        }
      }
    },

    moderation_reasoning: {
      system: `You are a content moderation assistant for a professional creative platform.
You help identify potentially problematic content while respecting creative expression.
Your goal is to flag content that violates community guidelines without over-censoring.`,
      developer: `Analyze content for:
- NSFW or inappropriate content
- Spam or promotional abuse
- Dangerous links or scams
- Hate speech or harassment
- Copyright concerns

Provide reasoning and severity level. Be lenient with creative content but strict with clear violations.`,
      user_template: `Content type: {{content_type}}
Text content: "{{text}}"
Has media: {{has_media}}
Media description: {{media_description}}

Analyze this content for potential violations.`,
      output_schema: {
        type: 'object',
        properties: {
          is_flagged: { type: 'boolean' },
          severity: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'critical'] },
          reasons: { type: 'array', items: { type: 'string' } },
          action_recommended: { type: 'string', enum: ['approve', 'review', 'hide', 'remove'] },
          confidence: { type: 'number' }
        }
      }
    },

    feed_affinity_scoring: {
      system: `You are a feed ranking algorithm assistant.
You help score content relevance for personalized feed ordering.`,
      developer: `Calculate affinity scores based on:
- Content freshness
- Creator-viewer relationship
- Content category match
- Engagement potential
- Quality signals`,
      user_template: `Viewer interests: {{interests}}
Content metadata: {{content}}
Creator relationship: {{relationship}}

Score this content's relevance for the viewer.`,
      output_schema: {
        type: 'object',
        properties: {
          relevance_score: { type: 'number' },
          factors: {
            type: 'object',
            properties: {
              freshness: { type: 'number' },
              relationship: { type: 'number' },
              category_match: { type: 'number' },
              quality: { type: 'number' }
            }
          }
        }
      }
    },

    blocks_suggestions: {
      system: `You are a profile optimization assistant for creative portfolios.
You help users structure their profile blocks for maximum impact.`,
      developer: `Suggest profile block structure based on:
- User's profession and goals
- Available content and achievements
- Best practices for their industry
- Engagement optimization`,
      user_template: `Profession: {{profession}}
Available content: {{content_types}}
Goals: {{goals}}

Suggest an optimal profile block structure.`,
      output_schema: {
        type: 'object',
        properties: {
          suggested_blocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                block_key: { type: 'string' },
                title: { type: 'string' },
                reason: { type: 'string' },
                priority: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }
};

export type PortfolioAIPromptKey = keyof typeof PORTFOLIO_AI_PROMPTS.prompts;
