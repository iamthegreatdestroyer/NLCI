// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'NLCI Documentation',
  tagline:
    'Neural-LSH Code Intelligence - Lightning-fast code clone detection powered by AI and LSH',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://iamthegreatdestroyer.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/NLCI/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'iamthegreatdestroyer', // Usually your GitHub org/user name.
  projectName: 'NLCI', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/iamthegreatdestroyer/NLCI/edit/main/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/nlci-social-card.jpg',
      navbar: {
        title: 'NLCI',
        logo: {
          alt: 'NLCI Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'index',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'doc',
            docId: 'tutorials/first-scan',
            position: 'left',
            label: 'Tutorials',
          },
          {
            type: 'doc',
            docId: 'api/README',
            position: 'left',
            label: 'API Reference',
          },
          {
            href: 'https://github.com/iamthegreatdestroyer/NLCI',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/tutorials/first-scan',
              },
              {
                label: 'Configuration',
                to: '/guides/configuration',
              },
              {
                label: 'API Reference',
                to: '/api',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/iamthegreatdestroyer/NLCI',
              },
              {
                label: 'Issues',
                href: 'https://github.com/iamthegreatdestroyer/NLCI/issues',
              },
              {
                label: 'Discussions',
                href: 'https://github.com/iamthegreatdestroyer/NLCI/discussions',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'VS Code Extension',
                href: 'https://marketplace.visualstudio.com/items?itemName=nlci.nlci-vscode',
              },
              {
                label: 'npm Package',
                href: 'https://www.npmjs.com/package/@nlci/core',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} NLCI. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: [
          'bash',
          'json',
          'typescript',
          'javascript',
          'yaml',
          'python',
          'powershell',
        ],
      },
      algolia: {
        // The application ID provided by Algolia
        appId: 'YOUR_APP_ID',
        // Public API key: it is safe to commit it
        apiKey: 'YOUR_SEARCH_API_KEY',
        indexName: 'nlci',
        // Optional: see doc section below
        contextualSearch: true,
        // Optional: Algolia search parameters
        searchParameters: {},
        // Optional: path for search page that enabled by default (`false` to disable it)
        searchPagePath: 'search',
      },
    }),
};

module.exports = config;
