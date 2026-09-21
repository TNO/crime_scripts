import { compressToEncodedURIComponent, decompressFromUint8Array } from 'lz-string';
import m from 'mithril';
import { Dialog, FlatButton, padLeft, Select, Sidenav, snackbar } from 'mithril-materialized';
import type { ConflictAction, DataModel, Page, ScriptMode } from '../../models';
import {
  canShareModel,
  classifiedExportFilename,
  filterModelForPublicExport,
  findStarterConflicts,
  hasRestrictedContent,
  importStarterBundle,
  normalizeDataModel,
  Pages,
} from '../../models';
import type { Languages, MeiosisComponent, UserRole } from '../../services';
import { fetchStarterBundle, i18n, loadData, routingSvc, t } from '../../services';
import { formatDate, isActivePage, JSON_FILE_ACCEPT, LANGUAGE, openFilePicker } from '../../utils';
import { LanguageSwitcher } from './language-switcher';

export const SideNav: MeiosisComponent<{ onDelete: () => void }> = () => {
  let starterImportOpen = false;
  let starterCandidate: DataModel | undefined;
  let starterError = false;
  let conflictChoices: Record<string, ConflictAction> = {};

  const prepareStarterImport = async (model: DataModel) => {
    try {
      starterCandidate = await fetchStarterBundle();
      starterError = false;
      conflictChoices = Object.fromEntries(
        findStarterConflicts(model, starterCandidate).map(({ id }) => [id, 'skip' as ConflictAction])
      );
    } catch {
      starterCandidate = undefined;
      starterError = true;
    }
    starterImportOpen = true;
    m.redraw();
  };

  const handleFileUpload = (binary: boolean, onLoaded: (model: DataModel) => void) => (e: Event) => {
    const fileInput = e.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length <= 0) return;

    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      if (e.target && e.target.result) {
        if (binary) {
          const arrayBuffer = e.target.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const decompressedString = decompressFromUint8Array(uint8Array);
          onLoaded(await loadData(decompressedString));
        } else {
          onLoaded(await loadData(e.target.result.toString()));
        }
      }
    };

    if (binary) {
      reader.readAsArrayBuffer(fileInput.files[0]);
    } else {
      reader.readAsText(fileInput.files[0]);
    }
  };

  const handleSelection = (
    option: string,
    model: DataModel,
    mode: 'public' | 'restricted',
    saveModel: (model: DataModel) => void,
    onLoaded: (model: DataModel) => void = () => {}
  ) => {
    switch (option) {
      case 'clear':
        saveModel(normalizeDataModel({ crimeScripts: [] }));
        break;
      case 'download_json': {
        const exportModel = mode === 'public' ? filterModelForPublicExport(model) : model;
        if (hasRestrictedContent(exportModel) && !window.confirm(t('RESTRICTED_EXPORT_CONFIRM'))) return;
        const version = typeof exportModel.version === 'undefined' ? 1 : exportModel.version + 1;
        const dataStr =
          'data:text/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify({ ...exportModel, version, lastUpdate: Date.now() }));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute('href', dataStr);
        dlAnchorElem.setAttribute(
          'download',
          classifiedExportFilename(
            `${formatDate()}_v${padLeft(version, 3)}_crime_scripts`,
            hasRestrictedContent(exportModel) ? 'restricted' : 'public',
            'json'
          )
        );
        dlAnchorElem.click();
        break;
      }
      // case 'download_bin': {
      //   const version = typeof model.version === 'undefined' ? 1 : model.version++;
      //   const binaryData = compressToUint8Array(JSON.stringify({ ...model, version }));
      //   const blob = new Blob([binaryData], { type: 'application/octet-stream' });
      //   const url = URL.createObjectURL(blob);
      //   const dlAnchorElem = document.createElement('a');
      //   dlAnchorElem.setAttribute('href', url);
      //   dlAnchorElem.setAttribute('download', `${formatDate()}_v${padLeft(version, 3)}_crime_scripts.bin`);
      //   dlAnchorElem.click();
      //   URL.revokeObjectURL(url);
      //   break;
      //       }
      case 'upload_json': {
        openFilePicker(JSON_FILE_ACCEPT, handleFileUpload(false, onLoaded));
        break;
      }
      // case 'upload_bin': {
      //   const fileInput = document.createElement('input');
      //   fileInput.type = 'file';
      //   fileInput.accept = '.bin';
      //   fileInput.onchange = handleFileUpload(true, saveModel);
      //   fileInput.click();
      //   break;
      // }
      case 'link': {
        const shareModel = mode === 'public' ? filterModelForPublicExport(model) : model;
        if (!canShareModel(shareModel)) return;
        const compressed = compressToEncodedURIComponent(JSON.stringify(shareModel));
        const url = `${window.location.href}${/\?/.test(window.location.href) ? '&' : '?'}model=${compressed}`;
        navigator.clipboard.writeText(url).then(
          () => {
            snackbar({
              message: 'Copied permanent link to clipboard.',
            });
          },
          (err) => {
            snackbar({
              message: 'Failed copying link to clipboard: ' + err,
              dismissible: true,
            });
          }
        );
        break;
      }
    }
  };

  return {
    view: ({
      attrs: {
        state,
        options,
        actions: { saveModel, setRole, setScriptMode, changePage, update, resetApplication },
      },
    }) => {
      const { model, role, page, sideNavOpen, scriptMode } = state;
      const relevantModel = scriptMode === 'public' ? filterModelForPublicExport(model) : model;
      const roleIcon = role === 'user' ? 'person' : role === 'editor' ? 'edit' : 'manage_accounts';

      const isActive = isActivePage(page);

      const conflicts = starterCandidate ? findStarterConflicts(model, starterCandidate) : [];

      return [
      m(
        Sidenav,
        {
          width: 300,
          isOpen: sideNavOpen,
          onToggle: (open) => update({ sideNavOpen: open }),
        },
        [
          routingSvc
            .getList()
            .filter(
              (d) =>
                d.id !== Pages.LANDING &&
                ((typeof d.visible === 'boolean' ? d.visible : d.visible(state)) || isActive(d))
            )
            .map((d: Page) =>
              m('li.hide-on-med-and-up', { class: isActive(d) }, [
                m(FlatButton, {
                  label: d.title,
                  className: d.iconClass ? ` ${d.iconClass}` : '',
                  // style,
                  iconName: typeof d.icon === 'string' ? d.icon : d.icon ? d.icon() : '',
                  // href: routingSvc.href(d.id),
                  onclick: () => changePage(d.id),
                }),
                // ),
              ])
            ),
          m(
            'li',
            m(FlatButton, {
              label: t('CLEAR'),
              iconName: 'clear',
              onclick: options?.onDelete,
            })
          ),
          m(
            'li',
            m(FlatButton, {
              label: t('IMPORT_STARTER'),
              iconName: 'library_add',
              onclick: () => prepareStarterImport(model),
            })
          ),
          m(
            'li',
            m(FlatButton, {
              label: t('DOWNLOAD'),
              onclick: () => handleSelection('download_json', model, scriptMode, saveModel),
              iconName: 'download',
            })
          ),
          m(
            'li',
            m(FlatButton, {
              label: t('UPLOAD'),
              onclick: () => handleSelection('upload_json', model, scriptMode, saveModel, (loadedModel) => {
                if (hasRestrictedContent(loadedModel)) setScriptMode('restricted');
                changePage(Pages.HOME);
              }),
              iconName: 'upload',
            })
          ),
          m(
            'li',
            m(FlatButton, {
              label: t('PERMALINK'),
              onclick: () => handleSelection('link', model, scriptMode, saveModel),
              iconName: 'link',
              disabled: !canShareModel(relevantModel),
              title: !canShareModel(relevantModel) ? t('RESTRICTED_SHARING_DISABLED') : undefined,
            })
          ),
          m(
            'li',
            m(
              '.row',
              m(Select<UserRole>, {
                checkedId: role,
                label: t('ROLE'),
                iconName: roleIcon,
                options: [
                  { id: 'user', label: t('USER') },
                  { id: 'editor', label: t('EDITOR') },
                  { id: 'admin', label: t('ADMIN') },
                ],
                onchange: (role) => {
                  setRole(role[0]);
                },
              })
            )
          ),
          m(
            'li',
            m(
              '.row',
              m(LanguageSwitcher, {
                onLanguageChange: async (language: Languages) => {
                  localStorage.setItem(LANGUAGE, language);
                  await i18n.loadAndSetLocale(language as Languages);
                },
                currentLanguage: i18n.currentLocale,
              })
            )
          ),
          m(
            'li',
            m(
              '.row',
              m(Select<ScriptMode>, {
                checkedId: scriptMode,
                label: t('SCRIPT_MODE'),
                iconName: scriptMode === 'public' ? 'public' : 'lock',
                options: [
                  { id: 'public', label: t('PUBLIC_MODE') },
                  { id: 'restricted', label: t('RESTRICTED_MODE') },
                ],
                onchange: ([mode]) => {
                  setScriptMode(mode);
                },
              })
            )
          ),
          m(
            'li',
            m(FlatButton, {
              label: t('RESET_APPLICATION'),
              iconName: 'restart_alt',
              onclick: () => {
                if (window.confirm(t('RESET_APPLICATION_CONFIRM'))) resetApplication();
              },
            })
          ),
        ]
        // clearModelOpen &&
        //   m(ModalPanel, {
        //     id: 'clear_model',
        //     isOpen: true,
        //     onClose: () => (clearModelOpen = false),
        //     title: t('DELETE_ITEM', 'TITLE', { item: t('MODEL') }),
        //     description: t('DELETE_ITEM', 'DESCRIPTION', { item: t('MODEL').toLowerCase() }),
        //     buttons: [
        //       { label: t('CANCEL'), iconName: 'cancel' },
        //       {
        //         label: t('DELETE'),
        //         iconName: 'delete',
        //         onclick: () => {
        //           saveModel(defaultModel);
        //         },
        //       },
        //     ],
        //   })
      ),
      starterImportOpen &&
        m(Dialog, {
          id: 'starter-import',
          isOpen: true,
          onToggle: (open: boolean) => (starterImportOpen = open),
          title: t('IMPORT_STARTER'),
          content: starterError
            ? m('p', t('STARTER_LOAD_FAILED'))
            : starterCandidate && [
                m('p', model.crimeScripts.length === 0
                  ? t('IMPORT_STARTER_EMPTY_CONFIRM')
                  : t('IMPORT_STARTER_PREVIEW', {
                      count: starterCandidate.crimeScripts.length,
                      conflicts: conflicts.length,
                    })),
                m('ul.collection', starterCandidate.crimeScripts.map((script) =>
                  m('li.collection-item.starter-import-row', [
                    m('span.starter-import-label', script.label),
                    conflicts.some(({ id }) => id === script.id) &&
                      m(Select<ConflictAction>, {
                        className: 'starter-conflict-action',
                        label: t('IMPORT_CONFLICT_ACTION'),
                        checkedId: conflictChoices[script.id],
                        options: [
                          { id: 'skip', label: t('SKIP') },
                          { id: 'replace', label: t('REPLACE') },
                          { id: 'copy', label: t('IMPORT_COPY') },
                        ],
                        onchange: ([choice]) => {
                          conflictChoices[script.id] = choice;
                        },
                      }),
                  ])
                )),
              ],
          secondaryAction: { label: t('CANCEL'), iconName: 'cancel' },
          primaryAction: starterError
            ? {
                label: t('RETRY'),
                iconName: 'refresh',
                onclick: () => prepareStarterImport(model),
              }
            : {
                label: t('IMPORT_STARTER'),
                iconName: 'library_add',
                onclick: () => {
                  if (!starterCandidate) return;
                  saveModel(importStarterBundle(model, starterCandidate, conflictChoices));
                  starterImportOpen = false;
                  snackbar({ message: t('STARTER_IMPORTED') });
                  update({ sideNavOpen: false });
                  changePage(Pages.HOME);
                },
              },
        }),
      ];
    },
  };
};

// export const SideNavTrigger: MeiosisComponent<{}> = () => {
//   return {
//     view: ({
//       attrs: {
//         actions: { saveModel, update },
//       },
//     }) => {
//       return [
//         m(
//           FlatButton,
//           {
//             iconName: 'menu',
//             onclick: () => update({ sideNavOpen: true }),
//           }
//           // 'a',
//           // {
//           //   href: '#!',
//           //   'data-target': 'slide-out',
//           //   style: { position: 'absolute', marginLeft: '10px', top: '75px' },
//           //   onclick: () => update({ sideNavOpen: true }),
//           // },
//           // m('i.material-icons', 'menu')
//         ),
//         m(ModalPanel, {
//           id: 'clear_model',
//           title: t('DELETE_ITEM', 'TITLE', { item: t('MODEL') }),
//           description: t('DELETE_ITEM', 'DESCRIPTION', { item: t('MODEL').toLowerCase() }),
//           buttons: [
//             { label: t('CANCEL'), iconName: 'cancel' },
//             {
//               label: t('DELETE'),
//               iconName: 'delete',
//               onclick: () => {
//                 saveModel(defaultModel);
//               },
//             },
//           ],
//         }),
//       ];
//     },
//   };
// };
