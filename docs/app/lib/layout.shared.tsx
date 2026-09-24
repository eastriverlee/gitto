import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Wordmark } from '@/components/logo';
import { gitConfig, siteOrigin } from './shared';

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: <Wordmark className="h-5 w-auto" />,
			url: siteOrigin,
		},
		githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
	};
}
