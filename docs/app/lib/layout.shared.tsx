import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig, siteOrigin } from './shared';

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: (
				<span className="flex items-center gap-2 font-semibold">
					<img src="/favicon.svg" alt="" className="size-6" />
					{appName}
				</span>
			),
			url: siteOrigin,
		},
		githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
	};
}
