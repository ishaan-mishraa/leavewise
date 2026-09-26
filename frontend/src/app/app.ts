import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiService } from './core/ui.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="toast" [class.show]="ui.toast()" role="status" aria-live="polite">{{ ui.toast() }}</div>
  `,
})
export class App {
  protected ui = inject(UiService);
}
