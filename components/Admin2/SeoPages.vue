<template>
  <section class="seo-admin-card">
    <div class="seo-admin-card__header">
      <div>
        <div class="seo-admin-kicker">SEO Pages</div>
        <h2 class="seo-admin-title">Manage landing, guide, and comparison pages</h2>
        <p class="seo-admin-subtitle">
          These pages are indexable search-entry pages that route visitors into chat.
        </p>
      </div>

      <div class="seo-admin-toolbar">
        <label class="seo-admin-field seo-admin-field--toolbar">
          <span class="seo-admin-field__label">Type</span>
          <select v-model="selectedType" class="seo-admin-field__control">
            <option v-for="option in typeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="seo-admin-button"
          @click="openImportDialog"
        >
          Import JSON
        </button>

        <button
          type="button"
          class="seo-admin-button seo-admin-button--primary"
          @click="openCreateDialog"
        >
          New SEO Page
        </button>
      </div>
    </div>

    <div class="seo-admin-card__body">
      <div
        v-if="translationLoading && translationJob?.status && dialog"
        class="seo-admin-banner seo-admin-banner--info"
        role="status"
      >
        Translation status: {{ translationJob.status }}
      </div>

      <LoadingContainer v-if="loading" text="Loading SEO pages..." />

      <div v-else class="seo-admin-table-wrap">
        <table class="seo-admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Locales</th>
              <th>Path</th>
              <th>Status</th>
              <th class="seo-admin-table__actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="page in filteredPages" :key="page.id">
              <td>
                <div class="seo-admin-table__title">{{ page.title }}</div>
                <div class="seo-admin-table__subtitle">
                  {{ page.metaDescription || page.subtitle || "No summary yet." }}
                </div>
              </td>
              <td>
                <span class="seo-admin-pill seo-admin-pill--type">{{ page.pageType }}</span>
              </td>
              <td>
                <div class="seo-admin-chip-list">
                  <span
                    v-for="locale in page.availableLocales"
                    :key="`${page.id}-${locale}`"
                    class="seo-admin-pill seo-admin-pill--locale"
                  >
                    {{ locale }}
                  </span>
                </div>
              </td>
              <td>
                <code class="seo-admin-path">{{ buildAdminPath(page) }}</code>
              </td>
              <td>
                <span
                  class="seo-admin-pill"
                  :class="page.isPublished ? 'seo-admin-pill--success' : 'seo-admin-pill--warning'"
                >
                  {{ page.isPublished ? "Published" : "Draft" }}
                </span>
              </td>
              <td>
                <div class="seo-admin-action-list">
                  <button
                    type="button"
                    class="seo-admin-button seo-admin-button--small"
                    @click="openPage(page)"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    class="seo-admin-button seo-admin-button--small"
                    @click="openEditDialog(page)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="seo-admin-button seo-admin-button--danger seo-admin-button--small"
                    @click="promptDeletePage(page)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!filteredPages.length">
              <td colspan="6">
                <div class="seo-admin-empty-state">No SEO pages match this filter yet.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <Transition name="seo-admin-dialog-fade">
      <div v-if="dialog" class="seo-admin-dialog-layer" role="presentation">
        <button
          type="button"
          class="seo-admin-dialog-backdrop"
          aria-label="Close SEO page dialog"
          @click="closeEditorDialog"
        />
        <div
          class="seo-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-admin-editor-title"
        >
          <div class="seo-admin-dialog__card seo-admin-dialog__card--wide">
            <div class="seo-admin-dialog__header">
              <div>
                <h2 id="seo-admin-editor-title" class="seo-admin-dialog__title">
                  {{ form.id ? "Edit SEO Page" : "Create SEO Page" }}
                </h2>
                <p class="seo-admin-dialog__subtitle">
                  Manage metadata, hero content, FAQ links, related links, and publication state.
                </p>
              </div>
              <button
                type="button"
                class="seo-admin-icon-button"
                aria-label="Close SEO page dialog"
                @click="closeEditorDialog"
              >
                ×
              </button>
            </div>

            <form class="seo-admin-dialog__body seo-admin-form" @submit.prevent="savePage">
              <div class="seo-admin-form-grid seo-admin-form-grid--top">
                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Page type</span>
                  <select
                    v-model="form.pageType"
                    class="seo-admin-field__control"
                    :class="fieldErrors.pageType ? 'is-invalid' : ''"
                  >
                    <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                  <span v-if="fieldErrors.pageType" class="seo-admin-field__error">
                    {{ fieldErrors.pageType }}
                  </span>
                </label>

                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Locale</span>
                  <select
                    :value="form.locale"
                    class="seo-admin-field__control"
                    :class="fieldErrors.locale ? 'is-invalid' : ''"
                    @change="onLocaleChange($event.target.value)"
                  >
                    <option
                      v-for="option in activeLocaleOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.title }}
                    </option>
                  </select>
                  <span v-if="fieldErrors.locale" class="seo-admin-field__error">
                    {{ fieldErrors.locale }}
                  </span>
                </label>

                <div class="seo-admin-field seo-admin-field--toggle">
                  <span class="seo-admin-field__label">Published</span>
                  <label class="seo-admin-switch seo-admin-switch--labeled">
                    <input
                      :checked="form.isPublished"
                      :disabled="publishToggling"
                      type="checkbox"
                      class="seo-admin-switch__input"
                      @change="onPublishedToggle($event.target.checked)"
                    >
                    <span class="seo-admin-switch__track">
                      <span class="seo-admin-switch__thumb" />
                    </span>
                    <span class="seo-admin-switch__label">
                      {{ publishToggling ? "Saving…" : form.isPublished ? "Published" : "Draft" }}
                    </span>
                  </label>
                </div>

                <div class="seo-admin-inline-actions">
                  <button
                    type="button"
                    class="seo-admin-button"
                    @click="openImportDialog"
                  >
                    Import JSON
                  </button>
                  <button
                    type="button"
                    class="seo-admin-button"
                    :disabled="!form.id || translationLoading"
                    @click="openTranslationDialog"
                  >
                    <span v-if="translationLoading" class="seo-admin-button__spinner" aria-hidden="true" />
                    Translate
                  </button>
                </div>
              </div>

              <div class="seo-admin-form-grid">
                <label class="seo-admin-field seo-admin-field--span-8">
                  <span class="seo-admin-field__label">Title</span>
                  <input
                    v-model="form.title"
                    type="text"
                    class="seo-admin-field__control"
                    :class="fieldErrors.title ? 'is-invalid' : ''"
                  >
                  <span v-if="fieldErrors.title" class="seo-admin-field__error">
                    {{ fieldErrors.title }}
                  </span>
                </label>

                <label class="seo-admin-field seo-admin-field--span-4">
                  <span class="seo-admin-field__label">Slug</span>
                  <input
                    v-model="form.slug"
                    type="text"
                    class="seo-admin-field__control"
                  >
                  <span class="seo-admin-field__hint">Auto-generated from title if blank.</span>
                </label>
              </div>

              <div class="seo-admin-preview-grid">
                <div class="seo-admin-preview-card">
                  <div class="seo-admin-preview-card__label">Slug preview</div>
                  <code class="seo-admin-preview-card__value">{{ slugPreview || "—" }}</code>
                </div>
                <div class="seo-admin-preview-card">
                  <div class="seo-admin-preview-card__label">Path preview</div>
                  <code class="seo-admin-preview-card__value">{{ pathPreview }}</code>
                </div>
              </div>

              <label class="seo-admin-field">
                <span class="seo-admin-field__label">Subtitle</span>
                <input v-model="form.subtitle" type="text" class="seo-admin-field__control">
              </label>

              <div class="seo-admin-form-grid">
                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Meta title</span>
                  <input v-model="form.metaTitle" type="text" class="seo-admin-field__control">
                </label>

                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Meta description</span>
                  <input v-model="form.metaDescription" type="text" class="seo-admin-field__control">
                </label>
              </div>

              <div class="seo-admin-form-grid">
                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Hero title</span>
                  <input v-model="form.heroTitle" type="text" class="seo-admin-field__control">
                </label>

                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Hero body</span>
                  <input v-model="form.heroBody" type="text" class="seo-admin-field__control">
                </label>
              </div>

              <label class="seo-admin-field">
                <span class="seo-admin-field__label">Hero image URL (optional)</span>
                <input v-model="form.heroImageUrl" type="text" class="seo-admin-field__control">
              </label>

              <div class="seo-admin-upload-panel">
                <label class="seo-admin-field seo-admin-field--upload">
                  <span class="seo-admin-field__label">Upload hero image</span>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    type="file"
                    class="seo-admin-field__control seo-admin-field__control--file"
                    @change="handleHeroImageChange"
                  >
                  <span class="seo-admin-field__hint">PNG, JPG, or WebP.</span>
                </label>

                <button
                  type="button"
                  class="seo-admin-button seo-admin-button--primary"
                  :disabled="!heroImageDataUrl || heroImageUploading"
                  @click="uploadHeroImage"
                >
                  <span v-if="heroImageUploading" class="seo-admin-button__spinner" aria-hidden="true" />
                  Upload image
                </button>
              </div>

              <div
                v-if="heroImagePreviewUrl || form.heroImageUrl"
                class="seo-admin-hero-grid"
              >
                <div class="seo-admin-hero-preview">
                  <div class="seo-admin-hero-preview__media">
                    <img
                      :src="heroImagePreviewUrl || form.heroImageUrl"
                      alt="SEO page hero preview"
                      class="seo-admin-hero-preview__image"
                    >
                    <div
                      v-if="!heroImagePreviewUrl && form.photoCreditsHtml"
                      class="seo-admin-hero-credit"
                      v-html="form.photoCreditsHtml"
                    />
                    <div
                      v-if="heroImagePreviewUrl"
                      class="seo-admin-hero-preview__status"
                    >
                      Ready to upload
                    </div>
                  </div>
                </div>

                <div class="seo-admin-hero-fields">
                  <label class="seo-admin-field">
                    <span class="seo-admin-field__label">Photo Credit URL</span>
                    <input
                      v-model="form.photoCreditsUrl"
                      type="text"
                      class="seo-admin-field__control"
                      :class="fieldErrors.photoCreditsUrl ? 'is-invalid' : ''"
                    >
                    <span v-if="fieldErrors.photoCreditsUrl" class="seo-admin-field__error">
                      {{ fieldErrors.photoCreditsUrl }}
                    </span>
                  </label>

                  <label class="seo-admin-field">
                    <span class="seo-admin-field__label">Photo Credit HTML</span>
                    <textarea
                      v-model="form.photoCreditsHtml"
                      rows="3"
                      class="seo-admin-field__control seo-admin-field__control--textarea"
                    ></textarea>
                    <span class="seo-admin-field__hint">
                      Example: &lt;a href="..."&gt;Photo: Jane Doe&lt;/a&gt;
                    </span>
                  </label>
                </div>
              </div>

              <label class="seo-admin-field">
                <span class="seo-admin-field__label">Body (Markdown)</span>
                <textarea
                  v-model="form.body"
                  rows="10"
                  class="seo-admin-field__control seo-admin-field__control--textarea"
                ></textarea>
              </label>

              <section class="seo-admin-section">
                <div class="seo-admin-section__header">
                  <div>
                    <h3 class="seo-admin-section__title">Highlights</h3>
                    <p class="seo-admin-section__subtitle">Short value props shown near the hero.</p>
                  </div>
                  <button
                    type="button"
                    class="seo-admin-button seo-admin-button--small"
                    @click="addHighlight"
                  >
                    Add highlight
                  </button>
                </div>

                <div class="seo-admin-highlight-list">
                  <div
                    v-for="(highlight, index) in form.highlights"
                    :key="`highlight-${index}`"
                    class="seo-admin-highlight-row"
                  >
                    <input
                      v-model="form.highlights[index]"
                      type="text"
                      class="seo-admin-field__control"
                      placeholder="Highlight"
                    >
                    <button
                      type="button"
                      class="seo-admin-button seo-admin-button--danger seo-admin-button--small"
                      @click="removeHighlight(index)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </section>

              <section class="seo-admin-section">
                <div class="seo-admin-section__header">
                  <div>
                    <h3 class="seo-admin-section__title">FAQ</h3>
                    <p class="seo-admin-section__subtitle">
                      Reuse the existing multilingual FAQ system.
                    </p>
                  </div>
                  <span class="seo-admin-pill seo-admin-pill--muted">
                    {{ form.faqEntryIds.length }} linked
                  </span>
                </div>

                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Search FAQ entries</span>
                  <input
                    v-model="faqSearch"
                    type="search"
                    class="seo-admin-field__control"
                    placeholder="Search by question"
                  >
                </label>

                <div v-if="form.faqEntryIds.length" class="seo-admin-chip-list seo-admin-chip-list--selected">
                  <span
                    v-for="faqId in form.faqEntryIds"
                    :key="faqId"
                    class="seo-admin-chip"
                  >
                    {{ faqLabelById[faqId] || faqId }}
                    <button type="button" class="seo-admin-chip__remove" @click="toggleFaqEntry(faqId)">
                      ×
                    </button>
                  </span>
                </div>

                <div class="seo-admin-selection-list">
                  <label
                    v-for="option in filteredFaqOptions"
                    :key="option.value"
                    class="seo-admin-selection-item"
                  >
                    <input
                      :checked="form.faqEntryIds.includes(option.value)"
                      type="checkbox"
                      @change="toggleFaqEntry(option.value)"
                    >
                    <span>{{ option.label }}</span>
                  </label>
                  <div v-if="!filteredFaqOptions.length" class="seo-admin-empty-inline">
                    No FAQ entries match this search.
                  </div>
                </div>
              </section>

              <section class="seo-admin-section">
                <div class="seo-admin-section__header">
                  <div>
                    <h3 class="seo-admin-section__title">Related links</h3>
                    <p class="seo-admin-section__subtitle">
                      Select internal landing, guide, topic, or compare pages.
                    </p>
                  </div>
                  <span class="seo-admin-pill seo-admin-pill--muted">
                    {{ form.relatedLinks.length }} linked
                  </span>
                </div>

                <label class="seo-admin-field">
                  <span class="seo-admin-field__label">Search linked pages</span>
                  <input
                    v-model="relatedLinkSearch"
                    type="search"
                    class="seo-admin-field__control"
                    placeholder="Search by title, path, or type"
                  >
                </label>

                <div v-if="form.relatedLinks.length" class="seo-admin-chip-list seo-admin-chip-list--selected">
                  <span
                    v-for="link in form.relatedLinks"
                    :key="link.href"
                    class="seo-admin-chip"
                  >
                    {{ link.label }}
                    <button type="button" class="seo-admin-chip__remove" @click="toggleRelatedLinkByHref(link.href)">
                      ×
                    </button>
                  </span>
                </div>

                <div class="seo-admin-selection-list">
                  <label
                    v-for="option in filteredSeoPageOptions"
                    :key="option.href"
                    class="seo-admin-selection-item seo-admin-selection-item--stacked"
                  >
                    <input
                      :checked="selectedRelatedLinkHrefs.includes(option.href)"
                      type="checkbox"
                      @change="toggleRelatedLink(option)"
                    >
                    <span>
                      <span class="seo-admin-selection-item__title">{{ option.title }}</span>
                      <span class="seo-admin-selection-item__meta">{{ option.pageType }} · {{ option.href }}</span>
                    </span>
                  </label>
                  <div v-if="!filteredSeoPageOptions.length" class="seo-admin-empty-inline">
                    No related pages match this search.
                  </div>
                </div>
              </section>

              <section class="seo-admin-section">
                <div class="seo-admin-section__header">
                  <div>
                    <h3 class="seo-admin-section__title">Call to action</h3>
                  </div>
                </div>

                <div class="seo-admin-form-grid">
                  <label class="seo-admin-field">
                    <span class="seo-admin-field__label">CTA label</span>
                    <input v-model="form.ctaLabel" type="text" class="seo-admin-field__control">
                  </label>

                  <label class="seo-admin-field">
                    <span class="seo-admin-field__label">CTA href</span>
                    <input v-model="form.ctaHref" type="text" class="seo-admin-field__control">
                  </label>
                </div>
              </section>
            </form>

            <div class="seo-admin-dialog__actions">
              <button type="button" class="seo-admin-button" @click="closeEditorDialog">
                Cancel
              </button>
              <button
                type="button"
                class="seo-admin-button seo-admin-button--primary"
                :disabled="saving"
                @click="savePage"
              >
                <span v-if="saving" class="seo-admin-button__spinner" aria-hidden="true" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="seo-admin-dialog-fade">
      <div v-if="translationDialog" class="seo-admin-dialog-layer" role="presentation">
        <button
          type="button"
          class="seo-admin-dialog-backdrop"
          aria-label="Close translation dialog"
          @click="translationDialog = false"
        />
        <div
          class="seo-admin-dialog seo-admin-dialog--compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-admin-translation-title"
        >
          <div class="seo-admin-dialog__card">
            <div class="seo-admin-dialog__header">
              <h2 id="seo-admin-translation-title" class="seo-admin-dialog__title">
                Translate SEO Page
              </h2>
              <button
                type="button"
                class="seo-admin-icon-button"
                aria-label="Close translation dialog"
                @click="translationDialog = false"
              >
                ×
              </button>
            </div>

            <div class="seo-admin-dialog__body">
              <div class="seo-admin-checkbox-list">
                <label
                  v-for="option in translationOptions"
                  :key="option.value"
                  class="seo-admin-selection-item"
                  :class="translationForm.translateAll ? 'is-disabled' : ''"
                >
                  <input
                    v-model="translationForm.locales"
                    :disabled="translationForm.translateAll"
                    type="checkbox"
                    :value="option.value"
                  >
                  <span>{{ option.label }}</span>
                </label>
              </div>

              <label class="seo-admin-selection-item">
                <input v-model="translationForm.translateAll" type="checkbox">
                <span>Translate to all other languages</span>
              </label>

              <label class="seo-admin-selection-item">
                <input v-model="translationForm.overwrite" type="checkbox">
                <span>Overwrite existing translation</span>
              </label>
            </div>

            <div class="seo-admin-dialog__actions">
              <button type="button" class="seo-admin-button" @click="translationDialog = false">
                Cancel
              </button>
              <button
                type="button"
                class="seo-admin-button seo-admin-button--primary"
                :disabled="translationLoading"
                @click="runTranslation"
              >
                <span v-if="translationLoading" class="seo-admin-button__spinner" aria-hidden="true" />
                Translate
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="seo-admin-dialog-fade">
      <div v-if="importDialog" class="seo-admin-dialog-layer" role="presentation">
        <button
          type="button"
          class="seo-admin-dialog-backdrop"
          aria-label="Close import dialog"
          @click="importDialog = false"
        />
        <div
          class="seo-admin-dialog seo-admin-dialog--medium"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-admin-import-title"
        >
          <div class="seo-admin-dialog__card">
            <div class="seo-admin-dialog__header">
              <h2 id="seo-admin-import-title" class="seo-admin-dialog__title">
                Import SEO Page JSON
              </h2>
              <button
                type="button"
                class="seo-admin-icon-button"
                aria-label="Close import dialog"
                @click="importDialog = false"
              >
                ×
              </button>
            </div>

            <div class="seo-admin-dialog__body">
              <div class="seo-admin-banner seo-admin-banner--info" role="status">
                Paste the full AI JSON output or upload a <code>.json</code> file. FAQ suggestions are not
                auto-linked to the multilingual FAQ system.
              </div>

              <label class="seo-admin-field">
                <span class="seo-admin-field__label">Upload JSON file</span>
                <input
                  accept="application/json,.json"
                  type="file"
                  class="seo-admin-field__control seo-admin-field__control--file"
                  @change="handleImportFileChange"
                >
              </label>

              <label class="seo-admin-field">
                <span class="seo-admin-field__label">SEO page JSON</span>
                <textarea
                  v-model="importJsonText"
                  rows="14"
                  class="seo-admin-field__control seo-admin-field__control--textarea"
                  placeholder='{"title":"...","slug":"...","body":"..."}'
                ></textarea>
              </label>
            </div>

            <div class="seo-admin-dialog__actions">
              <button type="button" class="seo-admin-button" @click="importDialog = false">
                Cancel
              </button>
              <button
                type="button"
                class="seo-admin-button seo-admin-button--primary"
                @click="applyImportedJson"
              >
                Apply to Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="seo-admin-dialog-fade">
      <div v-if="deleteDialog" class="seo-admin-dialog-layer" role="presentation">
        <button
          type="button"
          class="seo-admin-dialog-backdrop"
          aria-label="Close delete dialog"
          @click="closeDeleteDialog"
        />
        <div
          class="seo-admin-dialog seo-admin-dialog--compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-admin-delete-title"
        >
          <div class="seo-admin-dialog__card">
            <div class="seo-admin-dialog__header">
              <h2 id="seo-admin-delete-title" class="seo-admin-dialog__title">
                Delete SEO Page
              </h2>
            </div>
            <div class="seo-admin-dialog__body">
              Are you sure you want to delete
              <strong>{{ pagePendingDelete?.title }}</strong>?
            </div>
            <div class="seo-admin-dialog__actions">
              <button type="button" class="seo-admin-button" @click="closeDeleteDialog">
                Cancel
              </button>
              <button
                type="button"
                class="seo-admin-button seo-admin-button--danger"
                @click="confirmDeletePage"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <div class="seo-admin-toast-stack" aria-live="polite" aria-atomic="true">
      <Transition name="seo-admin-toast-fade">
        <div
          v-if="snackbar.show"
          class="seo-admin-toast"
          :class="snackbar.color === 'error' ? 'seo-admin-toast--error' : 'seo-admin-toast--success'"
          role="status"
        >
          {{ snackbar.message }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { buildSeoPagePath } from "@/utils/seoPagePaths";

const localePath = useLocalePath();

const typeOptions = [
  { label: "Landing", value: "landing" },
  { label: "Compare", value: "compare" },
  { label: "Guide", value: "guide" },
  { label: "Topic", value: "topic" },
];

const localeOptions = ["en", "fr", "ru", "zh"];

const loading = ref(true);
const saving = ref(false);
const publishToggling = ref(false);
const dialog = ref(false);
const editLocaleVariants = ref({});
const translationDialog = ref(false);
const importDialog = ref(false);
const deleteDialog = ref(false);
const selectedType = ref("landing");
const pages = ref([]);
const availableFaqs = ref([]);
const heroImageDataUrl = ref("");
const importJsonText = ref("");
const heroImageUploading = ref(false);
const translationLoading = ref(false);
const translationJob = ref(null);
const relatedLinkSearch = ref("");
const faqSearch = ref("");
const fieldErrors = ref({});
const pagePendingDelete = ref(null);
const snackbar = ref({
  show: false,
  color: "success",
  message: "",
});

let translationPollTimer = null;
let snackbarTimer = null;

const emptyForm = () => ({
  id: null,
  pageType: "landing",
  locale: "en",
  slug: "",
  title: "",
  subtitle: "",
  metaTitle: "",
  metaDescription: "",
  heroTitle: "",
  heroBody: "",
  heroImagePath: "",
  heroImageUrl: "",
  photoCreditsUrl: "",
  photoCreditsHtml: "",
  body: "",
  highlights: [""],
  faqEntryIds: [],
  relatedLinks: [],
  ctaLabel: "Start chatting",
  ctaHref: "/chat",
  isPublished: false,
});

const form = ref(emptyForm());
const translationForm = ref({
  locales: [],
  translateAll: false,
  overwrite: false,
});

const normalizeString = (value) => String(value || "").trim();
const normalizeStringArray = (value) =>
  Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];
const normalizeRelatedLinks = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => ({
          label: normalizeString(item?.label),
          href: normalizeString(item?.href),
        }))
        .filter((item) => item.label && item.href)
    : [];

const normalizeSeoSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const localePriority = ["en", "fr", "ru", "zh"];

const sortLocales = (locales) =>
  [...locales].sort((a, b) => {
    const aIndex = localePriority.indexOf(a);
    const bIndex = localePriority.indexOf(b);
    const safeA = aIndex === -1 ? localePriority.length : aIndex;
    const safeB = bIndex === -1 ? localePriority.length : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return String(a).localeCompare(String(b));
  });

const pickPrimaryPage = (group) => {
  const englishPage = group.find((page) => page.locale === "en");
  if (englishPage) return englishPage;
  return [...group].sort((a, b) => {
    if (Boolean(b.isPublished) !== Boolean(a.isPublished)) {
      return Number(Boolean(b.isPublished)) - Number(Boolean(a.isPublished));
    }
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  })[0];
};

const filteredPages = computed(() =>
  Object.values(
    pages.value.reduce((groups, page) => {
      if (page.pageType !== selectedType.value) return groups;
      const key = `${page.pageType}:${page.slug}`;
      groups[key] = groups[key] || [];
      groups[key].push(page);
      return groups;
    }, {})
  )
    .map((group) => {
      const primaryPage = pickPrimaryPage(group);
      const locales = sortLocales(
        group.map((page) => String(page.locale || "").trim().toLowerCase()).filter(Boolean)
      );

      return {
        ...primaryPage,
        localeSummary: locales.join(", "),
        availableLocales: locales,
        translationCount: locales.length,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    )
);

const translationOptions = computed(() => {
  const currentLocale = String(form.value.locale || "en")
    .trim()
    .toLowerCase();
  return localeOptions
    .filter((option) => option !== currentLocale)
    .map((option) => ({
      label: option.toUpperCase(),
      value: option,
    }));
});

const editLocaleOptions = computed(() =>
  localeOptions.map((locale) => ({
    title: editLocaleVariants.value[locale]
      ? locale.toUpperCase()
      : `${locale.toUpperCase()} (new)`,
    value: locale,
  }))
);

const activeLocaleOptions = computed(() =>
  Object.keys(editLocaleVariants.value).length
    ? editLocaleOptions.value
    : localeOptions.map((locale) => ({ title: locale.toUpperCase(), value: locale }))
);

const availableFaqOptions = computed(() =>
  availableFaqs.value.map((faq) => ({
    label: faq.question,
    value: faq.id,
  }))
);

const faqLabelById = computed(() =>
  Object.fromEntries(availableFaqOptions.value.map((option) => [option.value, option.label]))
);

const filteredFaqOptions = computed(() => {
  const search = normalizeString(faqSearch.value).toLowerCase();
  return availableFaqOptions.value.filter((option) =>
    !search || option.label.toLowerCase().includes(search)
  );
});

const availableSeoPageOptions = computed(() => {
  const seen = new Set();
  const currentSlug = form.value.slug;
  return pages.value
    .filter((p) => p.locale === "en")
    .filter((p) => {
      if (seen.has(p.slug) || p.slug === currentSlug) return false;
      seen.add(p.slug);
      return true;
    })
    .map((p) => ({
      title: p.title,
      subtitle: p.path,
      href: p.path,
      pageType: p.pageType,
    }));
});

const filteredSeoPageOptions = computed(() => {
  const search = normalizeString(relatedLinkSearch.value).toLowerCase();
  return availableSeoPageOptions.value.filter((option) => {
    if (!search) return true;
    return [option.title, option.subtitle, option.href, option.pageType]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
});

const selectedRelatedLinkHrefs = computed(() => form.value.relatedLinks.map((link) => link.href));

const slugPreview = computed(() => normalizeSeoSlug(form.value.slug || form.value.title));
const pathPreview = computed(() => buildSeoPagePath(form.value.pageType, slugPreview.value));
const heroImagePreviewUrl = computed(() => heroImageDataUrl.value || "");

const showMessage = (message, color = "success") => {
  snackbar.value = {
    show: true,
    color,
    message,
  };

  if (snackbarTimer) {
    clearTimeout(snackbarTimer);
  }

  snackbarTimer = setTimeout(() => {
    snackbar.value.show = false;
    snackbarTimer = null;
  }, 3500);
};

const resetDialogUiState = () => {
  fieldErrors.value = {};
  heroImageDataUrl.value = "";
  relatedLinkSearch.value = "";
  faqSearch.value = "";
};

const closeEditorDialog = () => {
  dialog.value = false;
  resetDialogUiState();
};

const loadPages = async () => {
  loading.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages", {
      query: {},
    });
    pages.value = response?.pages || [];
  } catch (error) {
    console.error("Failed to load SEO pages:", error);
    showMessage("Failed to load SEO pages.", "error");
  } finally {
    loading.value = false;
  }
};

const loadFaqs = async () => {
  try {
    const response = await $fetch("/api/faqs", {
      query: { locale: "en" },
    });
    availableFaqs.value = response?.data?.entries || [];
  } catch (error) {
    console.error("Failed to load FAQs:", error);
  }
};

const openCreateDialog = () => {
  editLocaleVariants.value = {};
  form.value = {
    ...emptyForm(),
    pageType: selectedType.value,
  };
  resetDialogUiState();
  dialog.value = true;
};

const openImportDialog = () => {
  if (!dialog.value) {
    editLocaleVariants.value = {};
    form.value = {
      ...emptyForm(),
      pageType: selectedType.value,
    };
    resetDialogUiState();
    dialog.value = true;
  }
  importDialog.value = true;
};

const populateFormFromPage = (page) => {
  form.value = {
    id: page.id,
    pageType: page.pageType,
    locale: page.locale,
    slug: page.slug,
    title: page.title,
    subtitle: page.subtitle || "",
    metaTitle: page.metaTitle || "",
    metaDescription: page.metaDescription || "",
    heroTitle: page.heroTitle || "",
    heroBody: page.heroBody || "",
    heroImagePath: page.heroImagePath || "",
    heroImageUrl: page.heroImageUrl || "",
    photoCreditsUrl: page.photoCreditsUrl || "",
    photoCreditsHtml: page.photoCreditsHtml || "",
    body: page.body || "",
    highlights: Array.isArray(page.highlights) && page.highlights.length
      ? [...page.highlights]
      : [""],
    faqEntryIds: Array.isArray(page.faqEntryIds) ? [...page.faqEntryIds] : [],
    relatedLinks: Array.isArray(page.relatedLinks)
      ? page.relatedLinks.map((link) => ({ ...link }))
      : [],
    ctaLabel: page.ctaLabel || "Start chatting",
    ctaHref: page.ctaHref || "/chat",
    isPublished: Boolean(page.isPublished),
  };
};

const openEditDialog = (page) => {
  const key = `${page.pageType}:${page.slug}`;
  const allVariants = pages.value.filter((p) => `${p.pageType}:${p.slug}` === key);
  editLocaleVariants.value = Object.fromEntries(allVariants.map((p) => [p.locale, p]));
  populateFormFromPage(page);
  resetDialogUiState();
  dialog.value = true;
};

const onLocaleChange = (newLocale) => {
  fieldErrors.value = {
    ...fieldErrors.value,
    locale: "",
  };
  const sharedImage = {
    heroImagePath: form.value.heroImagePath,
    heroImageUrl: form.value.heroImageUrl,
    photoCreditsUrl: form.value.photoCreditsUrl,
    photoCreditsHtml: form.value.photoCreditsHtml,
  };

  const variant = editLocaleVariants.value[newLocale];
  if (variant) {
    populateFormFromPage(variant);
    if (!form.value.heroImageUrl && sharedImage.heroImageUrl) {
      form.value.heroImagePath = sharedImage.heroImagePath;
      form.value.heroImageUrl = sharedImage.heroImageUrl;
      form.value.photoCreditsUrl = sharedImage.photoCreditsUrl;
      form.value.photoCreditsHtml = sharedImage.photoCreditsHtml;
    }
  } else {
    form.value = {
      ...emptyForm(),
      id: null,
      pageType: form.value.pageType,
      slug: form.value.slug,
      locale: newLocale,
      ...sharedImage,
    };
  }
};

const applyImportedPayload = (payload) => {
  const nextPageType = ["compare", "guide", "topic", "landing"].includes(
    normalizeString(payload?.pageType || payload?.type).toLowerCase()
  )
    ? normalizeString(payload?.pageType || payload?.type).toLowerCase()
    : form.value.pageType || selectedType.value || "landing";

  form.value = {
    ...form.value,
    pageType: nextPageType,
    locale: normalizeString(payload?.locale || form.value.locale || "en").toLowerCase() || "en",
    slug: normalizeString(payload?.slug || form.value.slug),
    title: normalizeString(payload?.title || form.value.title),
    subtitle: normalizeString(payload?.subtitle || form.value.subtitle),
    metaTitle: normalizeString(payload?.metaTitle || payload?.meta_title || form.value.metaTitle),
    metaDescription: normalizeString(
      payload?.metaDescription || payload?.meta_description || form.value.metaDescription
    ),
    heroTitle: normalizeString(payload?.heroTitle || payload?.hero_title || form.value.heroTitle),
    heroBody: normalizeString(payload?.heroBody || payload?.hero_body || form.value.heroBody),
    heroImageUrl: normalizeString(
      payload?.heroImageUrl || payload?.hero_image_url || form.value.heroImageUrl
    ),
    photoCreditsUrl: normalizeString(
      payload?.photoCreditsUrl || payload?.photo_credits_url || form.value.photoCreditsUrl
    ),
    photoCreditsHtml: normalizeString(
      payload?.photoCreditsHtml || payload?.photo_credits_html || form.value.photoCreditsHtml
    ),
    body: String(payload?.body || form.value.body || "").trim(),
    highlights: normalizeStringArray(payload?.highlights).length
      ? normalizeStringArray(payload?.highlights)
      : form.value.highlights,
    relatedLinks: normalizeRelatedLinks(payload?.relatedLinks).length
      ? normalizeRelatedLinks(payload?.relatedLinks)
      : form.value.relatedLinks,
    ctaLabel: normalizeString(payload?.ctaLabel || payload?.cta_label || form.value.ctaLabel),
    ctaHref: normalizeString(payload?.ctaHref || payload?.cta_href || form.value.ctaHref) || "/chat",
  };

  fieldErrors.value = {};
  selectedType.value = nextPageType;
  importDialog.value = false;
  const skippedFaqs = Array.isArray(payload?.faqSuggestions) && payload.faqSuggestions.length > 0;
  showMessage(
    skippedFaqs
      ? "JSON imported. FAQ suggestions were not linked automatically."
      : "JSON imported into the form."
  );
};

const applyImportedJson = () => {
  try {
    const parsed = JSON.parse(String(importJsonText.value || "").trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Import JSON must be a single object.");
    }
    applyImportedPayload(parsed);
  } catch (error) {
    showMessage(error?.message || "Failed to parse import JSON.", "error");
  }
};

const handleImportFileChange = async (event) => {
  const file = Array.isArray(event) ? event[0] : event?.target?.files?.[0] || event;
  if (!(file instanceof File)) return;
  try {
    importJsonText.value = await file.text();
  } catch (error) {
    showMessage(error?.message || "Failed to read JSON file.", "error");
  }
};

const stopTranslationPolling = () => {
  if (translationPollTimer) {
    clearInterval(translationPollTimer);
    translationPollTimer = null;
  }
};

const applyTranslationJob = async (job) => {
  translationJob.value = job || null;
  if (!job) return;

  if (job.status === "completed") {
    stopTranslationPolling();
    translationLoading.value = false;
    const parts = [];
    if (job.translated?.length) parts.push(`Translated: ${job.translated.join(", ")}`);
    if (job.skipped?.length) parts.push(`Skipped: ${job.skipped.join(", ")}`);
    translationDialog.value = false;
    await loadPages();
    if (dialog.value && form.value.pageType && form.value.slug) {
      const key = `${form.value.pageType}:${form.value.slug}`;
      const allVariants = pages.value.filter((p) => `${p.pageType}:${p.slug}` === key);
      editLocaleVariants.value = Object.fromEntries(allVariants.map((p) => [p.locale, p]));
    }
    showMessage(parts.length ? parts.join(" · ") : "Translation complete.");
  } else if (job.status === "failed") {
    stopTranslationPolling();
    translationLoading.value = false;
    showMessage(job.error || "Failed to translate SEO page.", "error");
  }
};

const pollTranslationJob = async (jobId) => {
  if (!jobId || !form.value.id) return;
  try {
    const response = await $fetch("/api/admin/seo-pages/translate-status", {
      query: {
        jobId,
        pageId: form.value.id,
      },
    });
    if (response?.success) {
      await applyTranslationJob(response.job || null);
    }
  } catch (error) {
    console.error("[admin] seo translation status", error);
  }
};

const startTranslationPolling = (jobId) => {
  stopTranslationPolling();
  pollTranslationJob(jobId);
  translationPollTimer = setInterval(() => {
    pollTranslationJob(jobId);
  }, 2000);
};

const openTranslationDialog = () => {
  const baseLocale = String(form.value.locale || "en")
    .trim()
    .toLowerCase();
  translationForm.value = {
    locales: [],
    translateAll: false,
    overwrite: false,
  };
  if (translationOptions.value.some((option) => option.value === baseLocale)) {
    translationForm.value.locales = [baseLocale];
  }
  translationDialog.value = true;
};

const runTranslation = async () => {
  if (!form.value.id) return;
  const targets = translationForm.value.translateAll
    ? translationOptions.value.map((option) => option.value)
    : translationForm.value.locales;

  if (!targets.length) {
    showMessage("Select at least one target language.", "error");
    return;
  }

  translationLoading.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages/translate", {
      method: "POST",
      body: {
        pageId: form.value.id,
        targetLocales: targets,
        sourceLocale: form.value.locale || "en",
        overwrite: translationForm.value.overwrite,
      },
    });

    if (!response?.success) {
      throw new Error(response?.error || "Translation failed.");
    }

    translationJob.value = response?.job || null;
    showMessage("Translation job started.");
    if (response?.job?.id) {
      startTranslationPolling(response.job.id);
    } else {
      translationLoading.value = false;
    }
  } catch (error) {
    stopTranslationPolling();
    console.error("[admin] translate seo page", error);
    showMessage(
      error?.data?.error || error?.message || "Failed to translate SEO page.",
      "error"
    );
    translationLoading.value = false;
  }
};

const buildFormPayload = () => ({
  id: form.value.id,
  pageType: form.value.pageType,
  locale: form.value.locale,
  slug: form.value.slug,
  title: form.value.title,
  subtitle: form.value.subtitle,
  metaTitle: form.value.metaTitle,
  metaDescription: form.value.metaDescription,
  heroTitle: form.value.heroTitle,
  heroBody: form.value.heroBody,
  heroImagePath: form.value.heroImagePath,
  heroImageUrl: form.value.heroImageUrl,
  photoCreditsUrl: form.value.photoCreditsUrl,
  photoCreditsHtml: form.value.photoCreditsHtml,
  body: form.value.body,
  highlights: form.value.highlights,
  faqEntryIds: form.value.faqEntryIds,
  relatedLinks: form.value.relatedLinks,
  ctaLabel: form.value.ctaLabel,
  ctaHref: form.value.ctaHref,
  isPublished: form.value.isPublished,
});

const applyPageSaveResponse = (saved) => {
  form.value.id = saved.id;
  editLocaleVariants.value = {
    ...editLocaleVariants.value,
    [saved.locale]: saved,
  };
  const next = pages.value.filter((page) => page.id !== saved.id);
  next.unshift(saved);
  pages.value = next;
};

const setFieldError = (name, message = "") => {
  fieldErrors.value = {
    ...fieldErrors.value,
    [name]: message,
  };
};

const validateForm = () => {
  const errors = {};

  if (!normalizeString(form.value.pageType)) errors.pageType = "Required";
  if (!normalizeString(form.value.locale)) errors.locale = "Required";
  if (!normalizeString(form.value.title)) errors.title = "Required";

  const photoCreditsUrlState = isValidUrl(form.value.photoCreditsUrl);
  if (photoCreditsUrlState !== true) {
    errors.photoCreditsUrl = photoCreditsUrlState;
  }

  fieldErrors.value = errors;
  if (Object.keys(errors).length) {
    showMessage("Please fix the highlighted fields.", "error");
    return false;
  }

  return true;
};

const onPublishedToggle = async (value) => {
  form.value.isPublished = value;
  if (!form.value.id) return;
  publishToggling.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages/save", {
      method: "POST",
      body: buildFormPayload(),
    });
    if (!response?.success) throw new Error(response?.error || "Failed to update.");
    applyPageSaveResponse(response.page);
    showMessage(value ? "Published." : "Unpublished.");
  } catch (error) {
    form.value.isPublished = !value;
    showMessage(error?.data?.error || error?.message || "Failed to update published state.", "error");
  } finally {
    publishToggling.value = false;
  }
};

const savePage = async () => {
  if (!validateForm()) return;

  saving.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages/save", {
      method: "POST",
      body: buildFormPayload(),
    });

    if (!response?.success) {
      throw new Error(
        response?.error ||
          response?.details?.message ||
          response?.details?.statusMessage ||
          "Failed to save SEO page."
      );
    }

    const saved = response?.page;
    if (!saved) {
      throw new Error("SEO page save returned no page payload.");
    }

    applyPageSaveResponse(saved);
    selectedType.value = saved.pageType;
    await loadPages();

    closeEditorDialog();
    showMessage("SEO page saved.");
  } catch (error) {
    console.error("Failed to save SEO page:", error);
    showMessage(
      error?.data?.error ||
        error?.data?.details?.message ||
        error?.data?.details?.statusMessage ||
        (error?.message === "Failed to fetch"
          ? "Request failed before the server returned a response."
          : null) ||
        error?.message ||
        "Failed to save SEO page.",
      "error"
    );
  } finally {
    saving.value = false;
  }
};

const promptDeletePage = (page) => {
  pagePendingDelete.value = page;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  pagePendingDelete.value = null;
};

const confirmDeletePage = async () => {
  const page = pagePendingDelete.value;
  if (!page?.id) return;

  try {
    await $fetch("/api/admin/seo-pages/delete", {
      method: "POST",
      body: { id: page.id },
    });
    pages.value = pages.value.filter((item) => item.id !== page.id);
    closeDeleteDialog();
    showMessage("SEO page deleted.");
  } catch (error) {
    console.error("Failed to delete SEO page:", error);
    showMessage("Failed to delete SEO page.", "error");
  }
};

const openPage = (page) => {
  navigateTo(localePath(page.path, page.locale), { external: true });
};

const buildAdminPath = (page) => buildSeoPagePath(page.pageType, page.slug);

const addHighlight = () => form.value.highlights.push("");

const removeHighlight = (index) => {
  if (form.value.highlights.length === 1) {
    form.value.highlights[0] = "";
    return;
  }
  form.value.highlights.splice(index, 1);
};

const toggleFaqEntry = (faqId) => {
  const next = new Set(form.value.faqEntryIds);
  if (next.has(faqId)) {
    next.delete(faqId);
  } else {
    next.add(faqId);
  }
  form.value.faqEntryIds = Array.from(next);
};

const toggleRelatedLink = (option) => {
  if (!option?.href) return;
  const exists = form.value.relatedLinks.some((link) => link.href === option.href);
  if (exists) {
    form.value.relatedLinks = form.value.relatedLinks.filter((link) => link.href !== option.href);
    return;
  }
  form.value.relatedLinks = [
    ...form.value.relatedLinks,
    { label: option.title || option.href, href: option.href },
  ];
};

const toggleRelatedLinkByHref = (href) => {
  const option = availableSeoPageOptions.value.find((entry) => entry.href === href);
  if (option) {
    toggleRelatedLink(option);
    return;
  }
  form.value.relatedLinks = form.value.relatedLinks.filter((link) => link.href !== href);
};

const handleHeroImageChange = async (event) => {
  const file = Array.isArray(event) ? event[0] : event?.target?.files?.[0] || event;
  if (!(file instanceof File)) {
    heroImageDataUrl.value = "";
    return;
  }
  heroImageDataUrl.value = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const uploadHeroImage = async () => {
  if (!heroImageDataUrl.value) return;
  heroImageUploading.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages/hero-image", {
      method: "POST",
      body: {
        dataUrl: heroImageDataUrl.value,
        pageType: form.value.pageType,
        slug: form.value.slug || form.value.title,
      },
    });
    form.value.heroImagePath = response?.storagePath || "";
    form.value.heroImageUrl = response?.publicUrl || "";
    heroImageDataUrl.value = "";
    showMessage("Hero image uploaded.");
  } catch (error) {
    console.error("Failed to upload hero image:", error);
    showMessage(
      error?.data?.error?.message || error?.message || "Failed to upload hero image.",
      "error"
    );
  } finally {
    heroImageUploading.value = false;
  }
};

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return "Must be a valid URL";
  }
};

watch(
  () => form.value.pageType,
  () => setFieldError("pageType")
);

watch(
  () => form.value.title,
  () => setFieldError("title")
);

watch(
  () => form.value.photoCreditsUrl,
  () => setFieldError("photoCreditsUrl")
);

onMounted(async () => {
  await Promise.all([loadPages(), loadFaqs()]);
});

onBeforeUnmount(() => {
  stopTranslationPolling();
  if (snackbarTimer) {
    clearTimeout(snackbarTimer);
    snackbarTimer = null;
  }
});
</script>

<style scoped>
.seo-admin-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 24px 54px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.seo-admin-card__header,
.seo-admin-card__body {
  padding: 1.5rem;
}

.seo-admin-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(var(--color-border), 0.65);
}

.seo-admin-kicker {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--color-primary));
}

.seo-admin-title {
  margin: 0.3rem 0 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: rgb(var(--color-text));
}

.seo-admin-subtitle,
.seo-admin-dialog__subtitle,
.seo-admin-section__subtitle,
.seo-admin-table__subtitle,
.seo-admin-selection-item__meta,
.seo-admin-empty-inline {
  color: rgba(var(--color-text), 0.68);
}

.seo-admin-subtitle {
  margin: 0.55rem 0 0;
  max-width: 52rem;
}

.seo-admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
}

.seo-admin-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.seo-admin-field--toolbar {
  min-width: 12rem;
}

.seo-admin-field__label {
  font-size: 0.84rem;
  font-weight: 600;
  color: rgba(var(--color-text), 0.76);
}

.seo-admin-field__control {
  width: 100%;
  min-height: 2.8rem;
  border: 1px solid rgba(var(--color-border), 0.9);
  border-radius: 14px;
  background: rgba(var(--color-surface), 0.96);
  color: rgb(var(--color-text));
  padding: 0.8rem 0.95rem;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.seo-admin-field__control:focus {
  outline: none;
  border-color: rgba(var(--color-primary), 0.7);
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.16);
}

.seo-admin-field__control.is-invalid {
  border-color: rgba(220, 38, 38, 0.75);
}

.seo-admin-field__control--textarea {
  min-height: 8rem;
  resize: vertical;
}

.seo-admin-field__control--file {
  padding: 0.7rem 0.9rem;
}

.seo-admin-field__hint,
.seo-admin-field__error,
.seo-admin-preview-card__label {
  font-size: 0.78rem;
}

.seo-admin-field__hint {
  color: rgba(var(--color-text), 0.62);
}

.seo-admin-field__error {
  color: #dc2626;
}

.seo-admin-button,
.seo-admin-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.7rem;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.88);
  background: rgba(var(--color-surface), 0.98);
  color: rgb(var(--color-text));
  font-weight: 600;
  padding: 0.75rem 1rem;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.seo-admin-button:hover,
.seo-admin-icon-button:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary), 0.45);
}

.seo-admin-button:disabled,
.seo-admin-icon-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.seo-admin-button--primary {
  border-color: rgba(var(--color-primary), 0.42);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.seo-admin-button--danger {
  border-color: rgba(220, 38, 38, 0.28);
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.seo-admin-button--small {
  min-height: 2.35rem;
  padding: 0.55rem 0.85rem;
  border-radius: 12px;
  font-size: 0.84rem;
}

.seo-admin-icon-button {
  width: 2.6rem;
  min-width: 2.6rem;
  padding: 0;
  font-size: 1.2rem;
}

.seo-admin-button__spinner {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: seo-admin-spin 0.8s linear infinite;
}

.seo-admin-banner {
  margin-bottom: 1rem;
  border-radius: 16px;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(var(--color-border), 0.85);
}

.seo-admin-banner--info {
  background: rgba(var(--color-primary), 0.1);
  border-color: rgba(var(--color-primary), 0.25);
  color: rgba(var(--color-text), 0.88);
}

.seo-admin-table-wrap {
  overflow-x: auto;
}

.seo-admin-table {
  width: 100%;
  border-collapse: collapse;
}

.seo-admin-table th,
.seo-admin-table td {
  padding: 1rem 0.9rem;
  border-bottom: 1px solid rgba(var(--color-border), 0.62);
  text-align: left;
  vertical-align: top;
}

.seo-admin-table th {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--color-text), 0.62);
}

.seo-admin-table__actions-heading {
  text-align: right;
}

.seo-admin-table td:last-child {
  width: 1%;
  white-space: nowrap;
}

.seo-admin-table__title {
  font-weight: 700;
  color: rgb(var(--color-text));
}

.seo-admin-action-list,
.seo-admin-chip-list,
.seo-admin-inline-actions,
.seo-admin-upload-panel,
.seo-admin-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.seo-admin-action-list {
  justify-content: flex-end;
}

.seo-admin-chip-list--selected {
  margin-bottom: 0.9rem;
}

.seo-admin-pill,
.seo-admin-chip,
.seo-admin-path,
.seo-admin-preview-card__value {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.seo-admin-pill {
  padding: 0.35rem 0.7rem;
  background: rgba(var(--color-border), 0.25);
  color: rgba(var(--color-text), 0.82);
}

.seo-admin-pill--type,
.seo-admin-pill--locale,
.seo-admin-pill--muted {
  background: rgba(var(--color-text), 0.06);
}

.seo-admin-pill--success {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.seo-admin-pill--warning {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.seo-admin-chip {
  padding: 0.4rem 0.8rem;
  background: rgba(var(--color-primary), 0.1);
  color: rgba(var(--color-text), 0.9);
}

.seo-admin-chip__remove {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
}

.seo-admin-path,
.seo-admin-preview-card__value {
  padding: 0.4rem 0.7rem;
  background: rgba(var(--color-text), 0.06);
  color: rgba(var(--color-text), 0.86);
  white-space: nowrap;
}

.seo-admin-empty-state {
  padding: 1.4rem 0;
  text-align: center;
  color: rgba(var(--color-text), 0.66);
}

.seo-admin-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.seo-admin-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.54);
}

.seo-admin-dialog {
  position: relative;
  z-index: 1;
  width: min(100%, 70rem);
  max-height: calc(100vh - 3rem);
}

.seo-admin-dialog--medium {
  width: min(100%, 48rem);
}

.seo-admin-dialog--compact {
  width: min(100%, 32rem);
}

.seo-admin-dialog__card {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 3rem);
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.98), rgba(var(--color-surface), 1));
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.seo-admin-dialog__card--wide {
  min-height: min(52rem, calc(100vh - 3rem));
}

.seo-admin-dialog__header,
.seo-admin-dialog__body,
.seo-admin-dialog__actions {
  padding: 1.25rem 1.35rem;
}

.seo-admin-dialog__header,
.seo-admin-dialog__actions,
.seo-admin-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.seo-admin-dialog__header,
.seo-admin-dialog__actions {
  border-bottom: 1px solid rgba(var(--color-border), 0.62);
}

.seo-admin-dialog__actions {
  border-top: 1px solid rgba(var(--color-border), 0.62);
  border-bottom: 0;
  justify-content: flex-end;
}

.seo-admin-dialog__title,
.seo-admin-section__title {
  margin: 0;
  font-weight: 700;
  color: rgb(var(--color-text));
}

.seo-admin-dialog__title {
  font-size: 1.2rem;
}

.seo-admin-dialog__subtitle,
.seo-admin-section__subtitle {
  margin: 0.35rem 0 0;
}

.seo-admin-dialog__body {
  overflow-y: auto;
}

.seo-admin-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.seo-admin-form-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
}

.seo-admin-form-grid > * {
  grid-column: span 6;
}

.seo-admin-form-grid--top > * {
  grid-column: span 3;
}

.seo-admin-field--span-8 {
  grid-column: span 8;
}

.seo-admin-field--span-4 {
  grid-column: span 4;
}

.seo-admin-field--toggle {
  justify-content: end;
}

.seo-admin-preview-grid {
  gap: 0.75rem;
}

.seo-admin-preview-card {
  min-width: 0;
  flex: 1 1 15rem;
  border: 1px solid rgba(var(--color-border), 0.72);
  border-radius: 18px;
  background: rgba(var(--color-surface), 0.8);
  padding: 0.85rem 1rem;
}

.seo-admin-section {
  border-top: 1px solid rgba(var(--color-border), 0.62);
  padding-top: 1rem;
}

.seo-admin-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.seo-admin-switch--labeled {
  min-height: 2.8rem;
}

.seo-admin-switch__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.seo-admin-switch__track {
  position: relative;
  width: 3rem;
  height: 1.75rem;
  border-radius: 999px;
  background: rgba(var(--color-text), 0.18);
  transition: background 0.18s ease;
}

.seo-admin-switch__thumb {
  position: absolute;
  top: 0.18rem;
  left: 0.18rem;
  width: 1.39rem;
  height: 1.39rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
  transition: transform 0.18s ease;
}

.seo-admin-switch__input:checked + .seo-admin-switch__track {
  background: rgba(34, 197, 94, 0.55);
}

.seo-admin-switch__input:checked + .seo-admin-switch__track .seo-admin-switch__thumb {
  transform: translateX(1.24rem);
}

.seo-admin-switch__label {
  font-weight: 600;
  color: rgba(var(--color-text), 0.82);
}

.seo-admin-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.seo-admin-hero-preview__media {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.72);
  background: rgba(var(--color-text), 0.04);
}

.seo-admin-hero-preview__image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.seo-admin-hero-preview__status {
  position: absolute;
  top: 0.85rem;
  left: 0.85rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(var(--color-primary), 0.82);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
}

.seo-admin-hero-credit {
  position: absolute;
  right: 12px;
  bottom: 12px;
  max-width: calc(100% - 24px);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seo-admin-hero-credit :deep(a) {
  color: inherit;
}

.seo-admin-highlight-list,
.seo-admin-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.seo-admin-highlight-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
}

.seo-admin-selection-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 16rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.seo-admin-selection-item {
  display: flex;
  align-items: start;
  gap: 0.7rem;
  border: 1px solid rgba(var(--color-border), 0.62);
  border-radius: 14px;
  background: rgba(var(--color-surface), 0.84);
  padding: 0.75rem 0.85rem;
}

.seo-admin-selection-item--stacked .seo-admin-selection-item__title {
  display: block;
  font-weight: 700;
  color: rgb(var(--color-text));
}

.seo-admin-selection-item.is-disabled {
  opacity: 0.55;
}

.seo-admin-empty-inline {
  padding: 0.6rem 0.2rem;
}

.seo-admin-toast-stack {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 1250;
}

.seo-admin-toast {
  min-width: 16rem;
  max-width: min(26rem, calc(100vw - 2rem));
  border-radius: 16px;
  padding: 0.95rem 1rem;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
  color: #fff;
  font-weight: 600;
}

.seo-admin-toast--success {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}

.seo-admin-toast--error {
  background: linear-gradient(135deg, #dc2626, #ef4444);
}

.seo-admin-dialog-fade-enter-active,
.seo-admin-dialog-fade-leave-active,
.seo-admin-toast-fade-enter-active,
.seo-admin-toast-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.seo-admin-dialog-fade-enter-from,
.seo-admin-dialog-fade-leave-to,
.seo-admin-toast-fade-enter-from,
.seo-admin-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes seo-admin-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .seo-admin-card__header,
  .seo-admin-card__body,
  .seo-admin-dialog__header,
  .seo-admin-dialog__body,
  .seo-admin-dialog__actions {
    padding: 1rem;
  }

  .seo-admin-form-grid,
  .seo-admin-hero-grid {
    grid-template-columns: 1fr;
  }

  .seo-admin-form-grid > *,
  .seo-admin-form-grid--top > *,
  .seo-admin-field--span-8,
  .seo-admin-field--span-4 {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .seo-admin-dialog-layer {
    padding: 0.75rem;
  }

  .seo-admin-dialog,
  .seo-admin-dialog--compact,
  .seo-admin-dialog--medium {
    width: 100%;
  }

  .seo-admin-action-list,
  .seo-admin-inline-actions,
  .seo-admin-upload-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .seo-admin-highlight-row {
    grid-template-columns: 1fr;
  }

  .seo-admin-toast-stack {
    left: 0.75rem;
    right: 0.75rem;
    top: auto;
    bottom: 0.75rem;
  }

  .seo-admin-toast {
    min-width: 0;
    width: 100%;
  }
}
</style>
