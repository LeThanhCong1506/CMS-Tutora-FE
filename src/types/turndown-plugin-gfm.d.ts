/**
 * `turndown-plugin-gfm` không kèm type và cũng không có gói `@types/` trên npm.
 * Khai báo đúng phần đang dùng: các plugin bổ sung cú pháp GFM cho TurndownService.
 */
declare module 'turndown-plugin-gfm' {
    import type TurndownService from 'turndown';

    export const gfm: TurndownService.Plugin;
    export const tables: TurndownService.Plugin;
    export const strikethrough: TurndownService.Plugin;
    export const taskListItems: TurndownService.Plugin;
    export const highlightedCodeBlock: TurndownService.Plugin;
}
