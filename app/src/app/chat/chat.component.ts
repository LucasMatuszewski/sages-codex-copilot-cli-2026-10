import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chat } from '@ai-sdk/angular';
@Component({ selector: 'app-chat', standalone: true, imports: [FormsModule], templateUrl: './chat.component.html', styleUrl: './chat.component.css' })
export class ChatComponent {
  readonly chat = new Chat({});
  readonly busy = computed(() => ['submitted', 'streaming'].includes(this.chat.status));
  readonly ready = signal<boolean | null>(null);
  input = '';
  constructor() {
    fetch('/api/health').then(r => r.json()).then(data => this.ready.set(data.configured)).catch(() => this.ready.set(false));
    effect(() => {
      this.chat.messages;
      setTimeout(() => document.querySelector('#conversation-end')?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);
    });
  }
  sendMessage() {
    const text = this.input.trim();
    if (!text || this.busy()) return;
    this.input = '';
    void this.chat.sendMessage({ text });
  }
  onEnter(event: Event) {
    const key = event as KeyboardEvent;
    if (!key.shiftKey && !key.isComposing) { event.preventDefault(); this.sendMessage(); }
  }
}
