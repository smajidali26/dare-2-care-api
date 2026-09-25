import { SettingRepository } from '../repositories/setting.repository';
import { whatWeDoContentSchema, WhatWeDoContent } from '../validators/homepage.validator';

/**
 * Stored as one JSON row in system_settings instead of its own table: it is a
 * single small document, and this way no migration is needed.
 */
const WHAT_WE_DO_KEY = 'home.what_we_do';

/**
 * The section as it was hard-coded on the homepage before it became editable.
 * Served until someone saves their own version, so nothing changes on the live
 * site when this ships.
 */
export const DEFAULT_WHAT_WE_DO: WhatWeDoContent = {
  heading: 'What We Do',
  subheading: 'Making a lasting impact through education and community support',
  items: [
    {
      title: 'Education Support',
      description: 'Providing educational resources and opportunities to students in need',
      icon: 'book-open',
      color: 'blue',
    },
    {
      title: 'Community Building',
      description: 'Creating strong, supportive communities that uplift one another',
      icon: 'user-group',
      color: 'green',
    },
    {
      title: 'Making Impact',
      description: 'Transforming lives through sustainable programs and initiatives',
      icon: 'heart',
      color: 'purple',
    },
  ],
};

export interface WhatWeDoSection extends WhatWeDoContent {
  /** When the section was last saved; null while the default is being served. */
  updatedAt: Date | null;
}

export class HomepageService {
  constructor(private settingRepository: SettingRepository) {}

  async getWhatWeDo(): Promise<WhatWeDoSection> {
    const setting = await this.settingRepository.findByKey(WHAT_WE_DO_KEY);
    if (!setting) {
      return { ...DEFAULT_WHAT_WE_DO, updatedAt: null };
    }

    // The row can also be edited as raw text on the super-admin Settings
    // screen, so re-check it: a bad edit there must not break the homepage.
    let stored: unknown;
    try {
      stored = JSON.parse(setting.value);
    } catch {
      stored = undefined;
    }
    const result = whatWeDoContentSchema.safeParse(stored);
    if (!result.success) {
      console.warn(`[homepage] "${WHAT_WE_DO_KEY}" does not hold valid section content; serving the default`);
      return { ...DEFAULT_WHAT_WE_DO, updatedAt: null };
    }
    return { ...result.data, updatedAt: setting.updatedAt };
  }

  async updateWhatWeDo(input: unknown): Promise<WhatWeDoSection> {
    // The validate middleware only checks the body; parsing again here trims
    // the text and drops any fields outside the schema before it is stored.
    const content = whatWeDoContentSchema.parse(input);
    const setting = await this.settingRepository.upsert({
      key: WHAT_WE_DO_KEY,
      value: JSON.stringify(content),
      category: 'homepage',
      description: 'Homepage "What We Do" section. Edit it in the admin portal under Content → Homepage.',
    });
    return { ...content, updatedAt: setting.updatedAt };
  }
}
