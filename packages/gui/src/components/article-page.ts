import m from 'mithril';
import { NewsArticle, Pages } from '../models';
import { MeiosisComponent, t } from '../services';
import { LayoutForm, SlimdownView, UIForm } from 'mithril-ui-form';
import { FlatButton, Select, TextInput } from 'mithril-materialized';

const newsArticlesForm: UIForm<{ articles: NewsArticle[] }> = [
  {
    id: 'articles',
    repeat: true,
    pageSize: 1,
    label: 'Articles',
    type: [
      { id: 'created', autogenerate: 'timestamp' },
      { id: 'id', autogenerate: 'id' },
      { id: 'title', label: 'Title', type: 'text', required: true, className: 'col s12' },
      { id: 'url', label: 'URL', type: 'url', required: true, className: 'col s12 m6 l6' },
      { id: 'imageUrl', label: 'Image', type: 'url', className: 'col s12 m6 l6' },
      { id: 'text', label: 'Text', type: 'textarea' },
      { id: 'tags', label: 'Tags', type: 'tags' },
      { id: 'source', label: 'Source', type: 'text', className: 'col s12 m6' },
      { id: 'publishedAt', label: 'Published at', type: 'date', className: 'col s12 m6' },
    ],
  },
];

export const ArticlePage: MeiosisComponent = () => {
  const itemsPerPage = 15;
  let selectedArticle: NewsArticle | null | undefined = null;
  let edit = false;
  let searchFilter = '';
  type SortBy = keyof Pick<NewsArticle, 'publishedAt' | 'created'>;

  let sortBy: SortBy = 'publishedAt';

  const searchBy = () => {
    const sf = searchFilter.toLowerCase().split(/\s+/);
    return (articles: NewsArticle) => {
      const { title = '', text = '', tags = [], source = '' } = articles;
      const txt = `${title} ${text} ${tags.join(' ')} ${source}`.toLowerCase();
      return sf.some((s) => txt.includes(s));
    };
  };

  return {
    oninit: ({
      attrs: {
        actions: { setPage },
      },
    }) => {
      setPage(Pages.ARTICLE);
    },
    view: ({ attrs: { state, actions } }) => {
      const { model, role } = state;
      const { articles = [] } = model;
      const id = m.route.param('id');
      selectedArticle = id ? articles.find((a) => a.id === id) : undefined;
      if (sortBy) {
        articles.sort((a, b) => {
          const valA = new Date(a[sortBy] || 0).valueOf();
          const valB = new Date(b[sortBy] || 0).valueOf();
          return valA > valB ? -1 : valA < valB ? 1 : 0;
        });
      }
      const isEditor = role === 'admin' || role === 'editor';
      return m(
        '#article-page.page',
        m('.row', [
          m(Select<SortBy>, {
            iconName: 'calendar_month',
            className: 'col s12 m3',
            initialValue: sortBy,
            label: t('SORT_BY'),
            options: [
              { id: 'publishedAt', label: t('PUBLISHED_AT') },
              { id: 'created', label: t('CREATED') },
            ],
            onchange: (v) => (sortBy = v[0]),
          }),
          m(TextInput, {
            label: t('FILTER', 'label'),
            placeholder: t('FILTER', 'ph'),
            iconName: 'filter_list',
            className: 'col s12 m6',
            initialValue: searchFilter,
            onchange: (v) => (searchFilter = v),
          }),
          isEditor &&
            m(
              '.col.s12.m3.right-align',
              edit
                ? m(FlatButton, {
                    label: t('SAVE'),
                    iconName: 'save',
                    className: 'small',
                    onclick: () => {
                      edit = false;
                      actions.saveModel(model);
                    },
                  })
                : !selectedArticle && [
                    m(FlatButton, {
                      label: t('EDIT'),
                      iconName: 'edit',
                      className: 'small',
                      onclick: () => {
                        edit = true;
                      },
                    }),
                  ]
            ),
          edit
            ? [
                m(LayoutForm<{ articles: NewsArticle[] }>, {
                  form: newsArticlesForm,
                  obj: model,
                }),
              ]
            : [
                selectedArticle
                  ? m(ArticleViewer, {
                      article: selectedArticle,
                      onClose: () => {
                        selectedArticle = null;
                        history.back();
                      },
                    })
                  : m(ArticleList, {
                      articles: articles.filter(searchBy()), // Pass your articles array here
                      onSelect: (article) => {
                        selectedArticle = article;
                        actions.changePage(Pages.ARTICLE, { id: article.id });
                      },
                      itemsPerPage,
                    }),
              ],
        ])
      );
    },
  };
};

interface ArticleListAttrs {
  articles: NewsArticle[];
  onSelect: (article: NewsArticle) => void;
  itemsPerPage: number;
}

export const ArticleList: m.FactoryComponent<ArticleListAttrs> = () => {
  let currentPage = 0;

  return {
    view: ({ attrs: { articles, onSelect, itemsPerPage } }) => {
      const totalPages = Math.ceil(articles.length / itemsPerPage);
      const startIndex = currentPage * itemsPerPage;
      const displayedArticles = articles.slice(startIndex, startIndex + itemsPerPage);

      return m('.news-grid.container', [
        // First row - two large articles
        m(
          '.row.first-row',
          displayedArticles.slice(0, 2).map((article) =>
            // Large article - spans 6 columns
            m(
              '.col.s12.m6',
              article &&
                m(
                  '.article-card.large',
                  {
                    onclick: () => onSelect(article),
                  },
                  [
                    article.imageUrl &&
                      m('.article-image', {
                        style: {
                          backgroundImage: `url(${article.imageUrl})`,
                        },
                      }),
                    m('.article-overlay', [
                      m(
                        'h5.article-title',
                        article.title,
                        article.publishedAt &&
                          m('span.date', ` (${new Date(article.publishedAt).toLocaleDateString()})`)
                      ),
                    ]),
                  ]
                )
            )
          )
        ),

        // Second row - three medium articles
        m(
          '.row.second-row',
          displayedArticles.slice(2, 5).map((article) =>
            m(
              '.col.s12.m4',
              m(
                '.article-card.medium',
                {
                  onclick: () => onSelect(article),
                },
                [
                  article.imageUrl &&
                    m('.article-image', {
                      style: {
                        backgroundImage: `url(${article.imageUrl})`,
                      },
                    }),
                  m('.article-content', [
                    m(
                      'h6.article-title',
                      article.title,
                      article.publishedAt && m('span.date', ` (${new Date(article.publishedAt).toLocaleDateString()})`)
                    ),
                    m(
                      '.article-excerpt',
                      m(SlimdownView, {
                        md: article.text.substring(0, article.imageUrl ? 150 : 500) + '...',
                        removeParagraphs: true,
                      })
                    ),
                  ]),
                ]
              )
            )
          )
        ),

        // Remaining articles in list format
        m(
          '.row.article-list',
          m(
            '.col.s12',
            m(
              'ul.collection',
              displayedArticles.slice(5).map((article) =>
                m(
                  'li.collection-item.avatar',
                  {
                    onclick: () => onSelect(article),
                  },
                  [
                    article.imageUrl && m('img.circle', { src: article.imageUrl }),
                    m('span.title', article.title),
                    m(
                      'p',
                      m('span', article.source),
                      article.source && article.publishedAt && m('span', ', '),
                      article.publishedAt && m('span.date', new Date(article.publishedAt).toLocaleDateString())
                    ),
                    m('p', m(SlimdownView, { md: article.text.substring(0, 250) + '...', removeParagraphs: true })),
                  ]
                )
              )
            )
          )
        ),

        // Pagination
        m(
          '.row.pagination-container',
          m('ul.pagination.center-align', [
            m(
              'li',
              {
                class: currentPage === 0 ? 'disabled' : 'waves-effect',
                onclick: () => currentPage > 0 && currentPage--,
              },
              m('a', m('i.material-icons', 'chevron_left'))
            ),

            Array.from({ length: totalPages }).map((_, idx) =>
              m(
                'li',
                {
                  class: currentPage === idx ? 'active' : 'waves-effect',
                  onclick: () => (currentPage = idx),
                },
                m('a', idx + 1)
              )
            ),

            m(
              'li',
              {
                class: currentPage === totalPages - 1 ? 'disabled' : 'waves-effect',
                onclick: () => currentPage < totalPages - 1 && currentPage++,
              },
              m('a', m('i.material-icons', 'chevron_right'))
            ),
          ])
        ),
      ]);
    },
  };
};

// components/ArticleViewer.ts
interface ArticleViewerAttrs {
  article: NewsArticle;
  onClose: () => void;
}

export const ArticleViewer: m.FactoryComponent<ArticleViewerAttrs> = () => {
  return {
    view: ({ attrs: { article, onClose } }) => {
      return m('.row.article-viewer', [
        // Fixed close button
        m(
          '.close-button-container',
          m(
            'button.btn-flat.waves-effect.close-button',
            {
              onclick: onClose,
            },
            m('i.material-icons', 'close')
          )
        ),

        // Article content
        m('.article-content-container', [
          article.imageUrl &&
            m('.hero-image', {
              style: {
                backgroundImage: `url(${article.imageUrl})`,
              },
            }),
          m('.article-main', [
            m('h1.article-title', article.title),
            m('.article-meta', [
              article.source && m('span.source', article.source),
              article.publishedAt && m('span.date', new Date(article.publishedAt).toLocaleDateString()),
              m(
                'a.source-link',
                {
                  href: article.url,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                },
                t('READ_ORIGINAL')
              ),
            ]),
            m('.article-text', m(SlimdownView, { md: article.text, removeParagraphs: true })),
          ]),
        ]),
      ]);
    },
  };
};
