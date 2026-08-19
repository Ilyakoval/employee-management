import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** Wraps case-insensitive matches of the search query in <mark>. */
@Pipe({ name: 'highlight' })
export class HighlightPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined, query: string): SafeHtml {
    const text = value ?? '';
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return this.sanitizer.bypassSecurityTrustHtml(escapeHtml(text));
    }

    const haystack = text.toLowerCase();
    let html = '';
    let position = 0;
    while (true) {
      const index = haystack.indexOf(needle, position);
      if (index < 0) {
        html += escapeHtml(text.slice(position));
        break;
      }
      html += escapeHtml(text.slice(position, index));
      html += `<mark>${escapeHtml(text.slice(index, index + needle.length))}</mark>`;
      position = index + needle.length;
    }
    // Safe: every text fragment is HTML-escaped above.
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
