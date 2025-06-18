import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { ActivityType, CrimeScript, DataModel, Hierarchical, ID, Labelled } from '../models';
import { t } from '../services';
import { addLeadingSpaces, measuresToMarkdown } from '.';
import { lookupCrimeMeasure } from '../models/situational-crime-prevention';

const blue = '2F5496';

/** Convert a crime script to a markdown string. */
export const crimeScriptToMarkdown = (crimeScript: Partial<CrimeScript>, model: DataModel) => {
  const { description, stages: scenes = [], literature, productIds, geoLocationIds } = crimeScript;
  const {
    acts,
    cast = [],
    attributes = [],
    transports = [],
    products = [],
    partners = [],
    geoLocations = [],
    locations = [],
  } = model;

  const itemLookup = [
    ...cast,
    ...attributes,
    ...transports,
    ...locations,
    ...products,
    ...partners,
    ...geoLocations,
  ].reduce((acc, cur) => acc.set(cur.id, cur), new Map<ID, Labelled & Hierarchical>());

  const md: string[] = [];

  const newHeading = (txt: string, level: number) => {
    const last = md.length - 1;
    if (last >= 0) {
      if (md[last] !== '' && !md[last].endsWith('\n')) {
        md.push('');
      }
    }
    md.push(`${'#'.repeat(level)} ${txt}\n`);
  };

  const createListItem = (list: string[], item: { label: string }, idx: number): string[] => {
    const { label = '' } = item;
    const lines = label.split('\n');
    list.push(`${idx + 1}. ${lines[0]}`);
    if (lines.length > 1) {
      const spaces = idx < 9 ? 3 : 4;
      for (let i = 1; i < lines.length; i++) {
        list.push(addLeadingSpaces(lines[i], spaces));
      }
    }
    return list;
  };

  if (description) {
    newHeading(`${t('INTRODUCTION')}\n`, 1);
    md.push(description);
  }
  if (productIds) {
    md.push(
      `${t('PRODUCTS', productIds.length)}: **${productIds
        .map((id) => itemLookup.get(id))
        .filter((i) => typeof i !== 'undefined')
        .map((i) => i.label)
        .join(', ')}**\n`
    );
  }
  if (geoLocationIds) {
    md.push(
      `${t('GEOLOCATIONS', geoLocationIds.length)}: **${geoLocationIds
        .map((id) => itemLookup.get(id))
        .filter((i) => typeof i !== 'undefined')
        .map((i) => i.label)
        .join(', ')}**\n`
    );
  }

  scenes.forEach((stage, i) => {
    const activityGroups = stage.ids.map((id) => acts.find((a) => a.id === id)).filter((a) => typeof a !== 'undefined');
    newHeading(`${t('SCENE')} ${i + 1}: ${activityGroups.map((a) => a.label).join(' | ')}`, 1);

    activityGroups.forEach((act) => {
      newHeading(act.label, 2);
      act.description && md.push(act.description);

      [{ ...act }].forEach((a) => {
        if (a && ((a.activities && a.activities.length > 0) || (a.conditions && a.conditions.length > 0))) {
          if (a.locationIds && a.locationIds.length > 0) {
            newHeading(t('LOCATIONS', a.locationIds.length), 3);
            md.push(
              a.locationIds
                .map((id) => itemLookup.get(id))
                .filter((l) => typeof l !== 'undefined')
                .map((l) => l.label)
                .join(', ') + '\n'
            );
          }

          if (a.activities && a.activities.length > 0) {
            newHeading(t('ACTIVITIES'), 4);
            const activitiesTxt = a.activities.reduce((list, activity, idx) => {
              createListItem(list, activity, idx);
              const type = activity.type ? (Array.isArray(activity.type) ? activity.type : [activity.type]) : undefined;
              const spaces = idx < 9 ? 3 : 4;
              if (type && type.includes(ActivityType.HAS_CAST) && activity.cast) {
                const castNames = activity.cast
                  .map((c) => {
                    const found = itemLookup.get(c);
                    return found ? found.label : undefined;
                  })
                  .filter((l) => typeof l !== undefined);
                list.push(addLeadingSpaces(`- ${t('CAST')}: ${castNames.join(', ')}`, spaces));
              }
              if (type && type.includes(ActivityType.HAS_ATTRIBUTES) && activity.attributes) {
                const attrNames = activity.attributes
                  .map((c) => {
                    const found = itemLookup.get(c);
                    return found ? found.label : undefined;
                  })
                  .filter((l) => typeof l !== undefined);
                list.push(addLeadingSpaces(`- ${t('ATTRIBUTES')}: ${attrNames.join(', ')}`, spaces));
              }
              if (type && type.includes(ActivityType.HAS_TRANSPORT) && activity.transports) {
                const transNames = activity.transports
                  .map((c) => {
                    const found = itemLookup.get(c);
                    return found ? found.label : undefined;
                  })
                  .filter((l) => typeof l !== undefined);
                list.push(addLeadingSpaces(`- ${t('TRANSPORTS')}: ${transNames.join(', ')}`, spaces));
              }
              return list;
            }, [] as string[]);
            activitiesTxt.push('');
            md.push(...activitiesTxt);
          }

          if (a.conditions && a.conditions.length > 0) {
            newHeading(t('CONDITIONS'), 4);
            const conditionsTxt = a.conditions.reduce(createListItem, [] as string[]);
            conditionsTxt.push('');
            md.push(...conditionsTxt);
          }

          if (a.indicators && a.indicators.length > 0) {
            newHeading(t('INDICATORS'), 4);
            const indicatorsTxt = a.indicators.reduce(createListItem, [] as string[]);
            indicatorsTxt.push('');
            md.push(...indicatorsTxt);
          }

          if (a.measures && a.measures.length > 0) {
            newHeading(t('MEASURES'), 4);
            const measureMd = measuresToMarkdown(a.measures, itemLookup, lookupCrimeMeasure());
            md.push(measureMd);
          }
        }
      });
    });
  });
  if (literature) {
    newHeading(t('REFERENCES'), 1);
    literature.forEach((l, i) => {
      const title = l.url ? `[${l.label}](l.url)` : l.label;
      md.push(`${i + 1}. ${title} (${l.authors || ''})`);
      l.description && md.push(addLeadingSpaces(l.description, i < 9 ? 3 : 4));
    });
  }
  const cleaner = cleanText();
  return md.map(cleaner).join('\n');
};

const cleanText = (replacement: string = '?') => {
  const replacer = /[\p{Cf}\uFFFE]/gu;
  return (text: string) => text.replace(replacer, replacement);
};

/** Converts a markdown string to a docx document */
export const markdownToDocx = (title = t('TITLE'), description = t('DESCRIPTION'), markdown = '') => {
  return new Document({
    creator: 'TNO',
    title,
    description,
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            color: '000000',
            language: {
              value: 'en-UK',
            },
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            color: blue,
            size: `18pt`,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            color: blue,
            size: `16pt`,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            color: blue,
            size: `14pt`,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        {
          id: 'Heading4',
          name: 'Heading 4',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            color: blue,
            size: `12pt`,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        {
          id: 'Heading5',
          name: 'Heading 5',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            color: blue,
            // size: `12pt`,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 120,
              after: 60,
            },
          },
        },
        {
          id: 'Heading6',
          name: 'Heading 6',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            // color: blue,
            // size: `12pt`,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 120,
              after: 60,
            },
          },
        },
        {
          id: 'aside',
          name: 'Aside',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            color: '999999',
            italics: true,
          },
          paragraph: {
            indent: {
              left: 720,
            },
            spacing: {
              line: 276,
            },
          },
        },
        {
          id: 'wellSpaced',
          name: 'Well Spaced',
          basedOn: 'Normal',
          quickFormat: true,
          paragraph: {
            spacing: { line: 276, before: 20 * 72 * 0.1, after: 20 * 72 * 0.05 },
          },
        },
        {
          id: 'ListParagraph',
          name: 'List Paragraph',
          basedOn: 'Normal',
          quickFormat: true,
        },
      ],
    },
    numbering: {
      config: [
        {
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.END,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.1) },
                },
              },
            },
          ],
          reference: 'my-numbering-reference',
        },
        {
          reference: 'my-bullet-points',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u25CF',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: '\u25E6',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.65), hanging: convertInchesToTwip(0.15) },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
          }),
          ...convertMarkdownToDocxParagraphs(markdown),
        ],
      },
    ],
  });
};

/** Converts a crime script to a Word docx document and saves it */
export const toWord = async (filename: string, cs: Partial<CrimeScript>, model: DataModel) => {
  const { label: title, description } = cs;

  const markdown = crimeScriptToMarkdown(cs, model);
  // console.log(markdown);

  const doc = markdownToDocx(title, description, markdown);

  Packer.toBlob(doc).then((blob) => {
    // saveAs from FileSaver will download the blob
    saveAs(blob, filename);
  });
};

const parseFormattedText = (text: string): (TextRun | ExternalHyperlink)[] => {
  const parts: (TextRun | ExternalHyperlink)[] = [];
  let currentText = '';
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrikethrough = false;

  const pushCurrentText = () => {
    if (currentText) {
      parts.push(
        new TextRun({
          text: currentText,
          bold: isBold,
          italics: isItalic,
          underline: isUnderline ? { color: 'red', type: 'dash' } : undefined,
          strike: isStrikethrough,
        })
      );
      currentText = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '*' || text[i] === '_') {
      if (i + 2 < text.length && text[i + 1] === text[i] && text[i + 2] === text[i]) {
        // Bold italic
        pushCurrentText();
        isBold = !isBold;
        isItalic = !isItalic;
        i += 2;
      } else if (text[i + 1] === text[i]) {
        // Bold
        pushCurrentText();
        isBold = !isBold;
        i++;
      } else {
        // Italic
        pushCurrentText();
        isItalic = !isItalic;
      }
    } else if (text[i] === '~' && text[i + 1] === '~') {
      pushCurrentText();
      isStrikethrough = !isStrikethrough;
      i++;
    } else if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i);
      const openParen = text.indexOf('(', closeBracket);
      const closeParen = text.indexOf(')', openParen);

      if (closeBracket !== -1 && openParen !== -1 && closeParen !== -1) {
        pushCurrentText();
        const linkText = text.slice(i + 1, closeBracket);
        const linkUrl = text.slice(openParen + 1, closeParen);
        parts.push(
          new ExternalHyperlink({
            children: [new TextRun({ text: linkText, style: 'Hyperlink' })],
            link: linkUrl,
          })
        );
        i = closeParen;
      } else {
        currentText += text[i];
      }
    } else {
      currentText += text[i];
    }
  }

  pushCurrentText();
  return parts;
};

const convertMarkdownToDocxParagraphs = (markdown?: string): Paragraph[] => {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];
  let listCounter = 0;
  let currentListInstance: number | null = null;

  interface ListItem {
    level: number;
    ordered: boolean;
    content: string[];
  }

  const getIndentLevel = (line: string): number => {
    return line.search(/\S|$/);
  };

  const createParagraph = (line: string, listItem?: ListItem): Paragraph => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('# ')) {
      currentListInstance = null;
      return new Paragraph({
        children: parseFormattedText(trimmedLine.substring(2)),
        heading: HeadingLevel.HEADING_1,
      });
    } else if (trimmedLine.startsWith('## ')) {
      currentListInstance = null;
      return new Paragraph({
        children: parseFormattedText(trimmedLine.substring(3)),
        heading: HeadingLevel.HEADING_2,
      });
    } else if (trimmedLine.startsWith('### ')) {
      currentListInstance = null;
      return new Paragraph({
        children: parseFormattedText(trimmedLine.substring(4)),
        heading: HeadingLevel.HEADING_3,
      });
    } else if (trimmedLine.startsWith('#### ')) {
      currentListInstance = null;
      return new Paragraph({
        children: parseFormattedText(trimmedLine.substring(5)),
        heading: HeadingLevel.HEADING_4,
      });
    } else if (trimmedLine.startsWith('##### ')) {
      currentListInstance = null;
      return new Paragraph({
        children: parseFormattedText(trimmedLine.substring(6)),
        heading: HeadingLevel.HEADING_5,
      });
    } else if (trimmedLine.startsWith('###### ')) {
      currentListInstance = null;
      return new Paragraph({
        children: parseFormattedText(trimmedLine.substring(7)),
        heading: HeadingLevel.HEADING_6,
      });
    } else if (listItem) {
      if (listItem.ordered) {
        if (currentListInstance === null) {
          listCounter++;
          currentListInstance = listCounter;
        }
        return new Paragraph({
          children: parseFormattedText(trimmedLine.replace(/^\d+\.\s/, '')),
          numbering: {
            reference: 'my-numbering-reference',
            level: listItem.level,
            instance: currentListInstance,
          },
        });
      } else {
        return new Paragraph({
          children: parseFormattedText(trimmedLine.startsWith('- ') ? trimmedLine.substring(2) : trimmedLine),
          numbering: {
            reference: 'my-bullet-points',
            level: listItem.level,
          },
          // bullet: {
          //   level: listItem.level,
          // },
        });
      }
    } else {
      currentListInstance = null;
      return new Paragraph({
        children: parseFormattedText(trimmedLine),
      });
    }
  };

  const processLines = (startIndex: number, parentLevel = -1): number => {
    let i = startIndex;
    let currentListItem: ListItem | undefined = undefined;

    while (i < lines.length) {
      const line = lines[i];
      const indentLevel = getIndentLevel(line);
      const trimmedLine = line.trim();

      if (indentLevel <= parentLevel) {
        // We've exited the current list level
        break;
      }

      const isOrderedListItem = trimmedLine.match(/^\d+\. /);
      const isBulletPoint = trimmedLine.startsWith('- ');

      if (isOrderedListItem || isBulletPoint) {
        // if (currentListItem) {
        //   currentListItem.content.forEach((content, index) => {
        //     paragraphs.push(createParagraph(content, index === 0 ? currentListItem : undefined));
        //   });
        // }
        // currentListItem = {
        //   level: Math.round(indentLevel / 3), // Assuming 3 spaces per indent level
        //   ordered: !!isOrderedListItem,
        //   content: [line],
        // };
        if (currentListItem) {
          currentListItem.content.push(line);
        } else {
          currentListItem = {
            level: Math.round(indentLevel / 3), // Assuming 3 spaces per indent level
            ordered: !!isOrderedListItem,
            content: [line],
          };
        }
        i++;
      } else if (currentListItem && indentLevel > 0 && indentLevel > parentLevel) {
        // This line belongs to the current list item
        // console.log(`Belongs to current list item: ${line}`);
        currentListItem.content.push(line);
        i++;
      } else {
        // This is a new paragraph
        if (currentListItem) {
          currentListItem.content.forEach((curLine) => {
            paragraphs.push(createParagraph(curLine, currentListItem));
          });
          currentListItem = undefined;
        }
        trimmedLine && paragraphs.push(createParagraph(line));
        i++;
      }

      // Check for nested list
      if (i < lines.length && getIndentLevel(lines[i]) > indentLevel) {
        if (currentListItem) {
          currentListItem.content.forEach((curLine) => {
            paragraphs.push(createParagraph(curLine, currentListItem));
          });
          currentListItem.content = [];
        }
        i = processLines(i, indentLevel);
      }
    }

    // Handle any remaining list item
    if (currentListItem) {
      currentListItem.content.forEach((curLine) => {
        paragraphs.push(createParagraph(curLine, currentListItem));
      });
    }

    return i;
  };

  processLines(0);

  return paragraphs;
};
