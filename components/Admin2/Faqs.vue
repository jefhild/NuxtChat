<template>
  <section class="faq-admin-card">
    <div class="faq-admin-card__header">
      <div>
        <div class="faq-admin-kicker">
          {{ $t("pages.admin.faq.kicker") }}
        </div>
        <h2 class="faq-admin-title">
          {{ $t("pages.admin.faq.title") }}
        </h2>
        <p class="faq-admin-subtitle">
          {{ $t("pages.admin.faq.subtitle") }}
        </p>
      </div>

      <div class="faq-admin-toolbar">
        <button
          type="button"
          class="faq-admin-button"
          @click="openImportFaqDialog"
        >
          Import JSON
        </button>
        <button
          type="button"
          class="faq-admin-button faq-admin-button--primary"
          @click="openNewFaq"
        >
          {{ $t("pages.admin.faq.newFaq") }}
        </button>
        <button
          type="button"
          class="faq-admin-button"
          @click="openNewGroup"
        >
          {{ $t("pages.admin.faq.newGroup") }}
        </button>
        <button
          type="button"
          class="faq-admin-button"
          @click="openNewTopic"
        >
          {{ $t("pages.admin.faq.newTopic") }}
        </button>
      </div>
    </div>

    <div class="faq-admin-card__body">
      <div class="faq-admin-layout">
        <section class="faq-admin-panel">
          <div class="faq-admin-panel__header">
            <h3 class="faq-admin-panel__title">
              {{ $t("pages.admin.faq.treeTitle") }}
            </h3>
          </div>

          <label class="faq-admin-field">
            <span class="faq-admin-field__label">
              {{ $t("pages.admin.faq.treeSearch") }}
            </span>
            <div class="faq-admin-search">
              <input
                v-model="topicSearch"
                type="search"
                class="faq-admin-field__control faq-admin-search__input"
                :placeholder="$t('pages.admin.faq.treeSearch')"
              >
              <button
                v-if="topicSearch"
                type="button"
                class="faq-admin-search__clear"
                aria-label="Clear tree search"
                @click="topicSearch = ''"
              >
                ×
              </button>
            </div>
          </label>

          <div
            v-if="loading"
            class="faq-admin-skeleton-list"
            aria-hidden="true"
          >
            <span
              v-for="index in 6"
              :key="`tree-skeleton-${index}`"
              class="faq-admin-skeleton faq-admin-skeleton--row"
            />
          </div>

          <div v-else class="faq-admin-tree">
            <div
              v-for="group in treeItems"
              :key="group.id"
              class="faq-admin-tree__group"
            >
              <div
                class="faq-admin-tree__row faq-admin-tree__row--group"
                :class="activated.includes(group.id) ? 'is-active' : ''"
              >
                <button
                  type="button"
                  class="faq-admin-tree__toggle"
                  :aria-expanded="String(isGroupOpen(group.id))"
                  :aria-label="`${isGroupOpen(group.id) ? 'Collapse' : 'Expand'} ${group.title}`"
                  @click="toggleGroup(group.id)"
                >
                  <span class="faq-admin-tree__toggle-icon">
                    {{ isGroupOpen(group.id) ? "▾" : "▸" }}
                  </span>
                </button>

                <button
                  type="button"
                  class="faq-admin-tree__item-button"
                  @click="selectTreeItem(group)"
                >
                  <span class="faq-admin-tree__icon">{{ iconFor(group) }}</span>
                  <span class="faq-admin-tree__title">{{ group.title }}</span>
                </button>

                <div class="faq-admin-tree__actions">
                  <button
                    type="button"
                    class="faq-admin-icon-button"
                    title="Edit translations"
                    aria-label="Edit translations"
                    @click.stop="openTranslationDialog(group)"
                  >
                    Tr
                  </button>
                </div>
              </div>

              <div
                v-if="isGroupOpen(group.id)"
                class="faq-admin-tree__children"
              >
                <div
                  v-for="topic in group.children || []"
                  :key="topic.id"
                  class="faq-admin-tree__row faq-admin-tree__row--topic"
                  :class="activated.includes(topic.id) ? 'is-active' : ''"
                >
                  <button
                    type="button"
                    class="faq-admin-tree__item-button faq-admin-tree__item-button--topic"
                    @click="selectTreeItem(topic)"
                  >
                    <span class="faq-admin-tree__icon">{{ iconFor(topic) }}</span>
                    <span class="faq-admin-tree__title">{{ topic.title }}</span>
                  </button>

                  <div class="faq-admin-tree__actions">
                    <button
                      type="button"
                      class="faq-admin-icon-button"
                      title="Edit translations"
                      aria-label="Edit translations"
                      @click.stop="openTranslationDialog(topic)"
                    >
                      Tr
                    </button>
                    <button
                      type="button"
                      class="faq-admin-icon-button faq-admin-icon-button--danger"
                      title="Delete topic"
                      aria-label="Delete topic"
                      @click.stop="removeTopic(topic)"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p
              v-if="!treeItems.length"
              class="faq-admin-empty-state"
            >
              No groups or topics match this filter yet.
            </p>
          </div>
        </section>

        <section class="faq-admin-panel">
          <div class="faq-admin-panel__header faq-admin-panel__header--between">
            <h3 class="faq-admin-panel__title">
              {{ $t("pages.admin.faq.tableTitle") }}
            </h3>
            <span class="faq-admin-pill faq-admin-pill--primary">
              {{ tableRows.length }} {{ $t("pages.admin.faq.items") }}
            </span>
          </div>

          <div
            v-if="loading"
            class="faq-admin-skeleton-list"
            aria-hidden="true"
          >
            <span
              v-for="index in 5"
              :key="`table-skeleton-${index}`"
              class="faq-admin-skeleton faq-admin-skeleton--table"
            />
          </div>

          <div v-else class="faq-admin-table-wrap">
            <table class="faq-admin-table">
              <thead>
                <tr>
                  <th>{{ $t("pages.admin.faq.columns.question") }}</th>
                  <th>{{ $t("pages.admin.faq.columns.topic") }}</th>
                  <th>{{ $t("pages.admin.faq.columns.status") }}</th>
                  <th>{{ $t("pages.admin.faq.columns.translations") }}</th>
                  <th class="faq-admin-table__actions-heading">
                    {{ $t("pages.admin.faq.columns.actions") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in tableRows" :key="row.id">
                  <td>{{ row.question }}</td>
                  <td>{{ row.topicTitle }}</td>
                  <td>
                    <span
                      class="faq-admin-pill"
                      :class="row.isActive ? 'faq-admin-pill--success' : 'faq-admin-pill--warning'"
                    >
                      {{ row.isActive ? "Published" : "Draft" }}
                    </span>
                  </td>
                  <td>
                    <div class="faq-admin-chip-list">
                      <span
                        v-for="localeOption in localeOptions"
                        :key="`${row.id}-${localeOption}`"
                        class="faq-admin-pill faq-admin-pill--locale"
                        :class="row.translations[localeOption] ? 'faq-admin-pill--success' : 'faq-admin-pill--muted'"
                      >
                        {{ localeOption }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="faq-admin-action-list">
                      <button
                        type="button"
                        class="faq-admin-icon-button"
                        title="Edit FAQ"
                        aria-label="Edit FAQ"
                        @click="openEditFaq(row)"
                      >
                        Edit
                      </button>
                      <ClientOnly>
                        <button
                          type="button"
                          class="faq-admin-icon-button"
                          :title="$t('pages.admin.faq.copyLink')"
                          :aria-label="$t('pages.admin.faq.copyLink')"
                          @click="copyFaqLink(row)"
                        >
                          Link
                        </button>
                        <template #fallback>
                          <button
                            type="button"
                            class="faq-admin-icon-button"
                            aria-label="Copy FAQ link"
                            title="Copy FAQ link"
                            @click="copyFaqLink(row)"
                          >
                            Link
                          </button>
                        </template>
                      </ClientOnly>
                      <button
                        type="button"
                        class="faq-admin-icon-button faq-admin-icon-button--danger"
                        title="Delete FAQ"
                        aria-label="Delete FAQ"
                        @click="removeFaq(row)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!tableRows.length">
                  <td colspan="5" class="faq-admin-table__empty">
                    No FAQs match this filter yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <Transition name="faq-admin-dialog-fade">
      <div
        v-if="newGroupDialog"
        class="faq-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="faq-admin-dialog-backdrop"
          aria-label="Close new group dialog"
          @click="closeNewGroupDialog"
        />
        <div
          class="faq-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faq-admin-new-group-title"
        >
          <div class="faq-admin-dialog__card faq-admin-dialog__card--medium">
            <div class="faq-admin-dialog__header">
              <h3 id="faq-admin-new-group-title" class="faq-admin-dialog__title">
                New group
              </h3>
            </div>
            <form class="faq-admin-dialog__body" @submit.prevent="createGroup">
              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Locale</span>
                <select
                  v-model="newGroup.locale"
                  class="faq-admin-field__control"
                >
                  <option
                    v-for="localeOption in localeOptions"
                    :key="`new-group-${localeOption}`"
                    :value="localeOption"
                  >
                    {{ localeOption }}
                  </option>
                </select>
                <span v-if="formErrors.group.locale" class="faq-admin-field__error">
                  {{ formErrors.group.locale }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Title</span>
                <input
                  v-model="newGroup.title"
                  type="text"
                  class="faq-admin-field__control"
                >
                <span v-if="formErrors.group.title" class="faq-admin-field__error">
                  {{ formErrors.group.title }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Slug (optional)</span>
                <input
                  v-model="newGroup.slug"
                  type="text"
                  class="faq-admin-field__control"
                >
              </label>

              <label class="faq-admin-checkbox">
                <input v-model="newGroup.isActive" type="checkbox">
                <span>Published</span>
              </label>

              <div class="faq-admin-dialog__actions">
                <button
                  type="button"
                  class="faq-admin-button"
                  @click="closeNewGroupDialog"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="faq-admin-button faq-admin-button--primary"
                  :disabled="saving"
                >
                  <span v-if="saving" class="faq-admin-button__spinner" aria-hidden="true" />
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="faq-admin-dialog-fade">
      <div
        v-if="newTopicDialog"
        class="faq-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="faq-admin-dialog-backdrop"
          aria-label="Close new topic dialog"
          @click="closeNewTopicDialog"
        />
        <div
          class="faq-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faq-admin-new-topic-title"
        >
          <div class="faq-admin-dialog__card faq-admin-dialog__card--medium">
            <div class="faq-admin-dialog__header">
              <h3 id="faq-admin-new-topic-title" class="faq-admin-dialog__title">
                New topic
              </h3>
            </div>
            <form class="faq-admin-dialog__body" @submit.prevent="createTopic">
              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Group</span>
                <select
                  v-model="newTopic.groupId"
                  class="faq-admin-field__control"
                >
                  <option value="">Select a group</option>
                  <option
                    v-for="group in groupOptions"
                    :key="group.id"
                    :value="group.id"
                  >
                    {{ group.title }}
                  </option>
                </select>
                <span v-if="formErrors.topic.groupId" class="faq-admin-field__error">
                  {{ formErrors.topic.groupId }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Locale</span>
                <select
                  v-model="newTopic.locale"
                  class="faq-admin-field__control"
                >
                  <option
                    v-for="localeOption in localeOptions"
                    :key="`new-topic-${localeOption}`"
                    :value="localeOption"
                  >
                    {{ localeOption }}
                  </option>
                </select>
                <span v-if="formErrors.topic.locale" class="faq-admin-field__error">
                  {{ formErrors.topic.locale }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Title</span>
                <input
                  v-model="newTopic.title"
                  type="text"
                  class="faq-admin-field__control"
                >
                <span v-if="formErrors.topic.title" class="faq-admin-field__error">
                  {{ formErrors.topic.title }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Slug (optional)</span>
                <input
                  v-model="newTopic.slug"
                  type="text"
                  class="faq-admin-field__control"
                >
              </label>

              <label class="faq-admin-checkbox">
                <input v-model="newTopic.isActive" type="checkbox">
                <span>Published</span>
              </label>

              <div class="faq-admin-dialog__actions">
                <button
                  type="button"
                  class="faq-admin-button"
                  @click="closeNewTopicDialog"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="faq-admin-button faq-admin-button--primary"
                  :disabled="saving"
                >
                  <span v-if="saving" class="faq-admin-button__spinner" aria-hidden="true" />
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="faq-admin-dialog-fade">
      <div
        v-if="newFaqDialog"
        class="faq-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="faq-admin-dialog-backdrop"
          aria-label="Close new FAQ dialog"
          @click="closeNewFaqDialog"
        />
        <div
          class="faq-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faq-admin-new-faq-title"
        >
          <div class="faq-admin-dialog__card faq-admin-dialog__card--large">
            <div class="faq-admin-dialog__header">
              <h3 id="faq-admin-new-faq-title" class="faq-admin-dialog__title">
                New FAQ
              </h3>
            </div>
            <form class="faq-admin-dialog__body" @submit.prevent="createFaq">
              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Topic</span>
                <select
                  v-model="newFaq.topicId"
                  class="faq-admin-field__control"
                >
                  <option value="">Select a topic</option>
                  <option
                    v-for="topic in topicOptions"
                    :key="topic.id"
                    :value="topic.id"
                  >
                    {{ topic.title }}
                  </option>
                </select>
                <span v-if="formErrors.faq.topicId" class="faq-admin-field__error">
                  {{ formErrors.faq.topicId }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Locale</span>
                <select
                  v-model="newFaq.locale"
                  class="faq-admin-field__control"
                >
                  <option
                    v-for="localeOption in localeOptions"
                    :key="`new-faq-${localeOption}`"
                    :value="localeOption"
                  >
                    {{ localeOption }}
                  </option>
                </select>
                <span v-if="formErrors.faq.locale" class="faq-admin-field__error">
                  {{ formErrors.faq.locale }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Question</span>
                <input
                  v-model="newFaq.question"
                  type="text"
                  class="faq-admin-field__control"
                >
                <span v-if="formErrors.faq.question" class="faq-admin-field__error">
                  {{ formErrors.faq.question }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Answer</span>
                <textarea
                  v-model="newFaq.answer"
                  rows="4"
                  class="faq-admin-field__control faq-admin-field__control--textarea"
                ></textarea>
                <span v-if="formErrors.faq.answer" class="faq-admin-field__error">
                  {{ formErrors.faq.answer }}
                </span>
              </label>

              <label class="faq-admin-checkbox">
                <input v-model="newFaq.isActive" type="checkbox">
                <span>Published</span>
              </label>

              <div class="faq-admin-dialog__actions">
                <button
                  type="button"
                  class="faq-admin-button"
                  @click="closeNewFaqDialog"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="faq-admin-button faq-admin-button--primary"
                  :disabled="saving"
                >
                  <span v-if="saving" class="faq-admin-button__spinner" aria-hidden="true" />
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="faq-admin-dialog-fade">
      <div
        v-if="importFaqDialog"
        class="faq-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="faq-admin-dialog-backdrop"
          aria-label="Close import FAQs dialog"
          @click="closeImportFaqDialog"
        />
        <div
          class="faq-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faq-admin-import-faq-title"
        >
          <div class="faq-admin-dialog__card faq-admin-dialog__card--xlarge">
            <div class="faq-admin-dialog__header">
              <h3 id="faq-admin-import-faq-title" class="faq-admin-dialog__title">
                Import FAQs
              </h3>
            </div>
            <form class="faq-admin-dialog__body" @submit.prevent="importFaqs">
              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Topic</span>
                <select
                  v-model="importFaq.topicId"
                  class="faq-admin-field__control"
                >
                  <option value="">Select a topic</option>
                  <option
                    v-for="topic in topicOptions"
                    :key="`import-${topic.id}`"
                    :value="topic.id"
                  >
                    {{ topic.title }}
                  </option>
                </select>
                <span v-if="formErrors.importFaq.topicId" class="faq-admin-field__error">
                  {{ formErrors.importFaq.topicId }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Locale</span>
                <select
                  v-model="importFaq.locale"
                  class="faq-admin-field__control"
                >
                  <option
                    v-for="localeOption in localeOptions"
                    :key="`import-locale-${localeOption}`"
                    :value="localeOption"
                  >
                    {{ localeOption }}
                  </option>
                </select>
                <span v-if="formErrors.importFaq.locale" class="faq-admin-field__error">
                  {{ formErrors.importFaq.locale }}
                </span>
              </label>

              <label class="faq-admin-checkbox">
                <input v-model="importFaq.isActive" type="checkbox">
                <span>Published</span>
              </label>

              <div class="faq-admin-note">
                Paste a JSON array like
                <code>[{"question":"...","answer":"..."}]</code>
              </div>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">FAQ JSON</span>
                <textarea
                  v-model="importFaq.payload"
                  rows="10"
                  class="faq-admin-field__control faq-admin-field__control--textarea"
                ></textarea>
                <span v-if="formErrors.importFaq.payload" class="faq-admin-field__error">
                  {{ formErrors.importFaq.payload }}
                </span>
              </label>

              <div class="faq-admin-dialog__actions">
                <button
                  type="button"
                  class="faq-admin-button"
                  @click="closeImportFaqDialog"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="faq-admin-button faq-admin-button--primary"
                  :disabled="saving"
                >
                  <span v-if="saving" class="faq-admin-button__spinner" aria-hidden="true" />
                  Import
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="faq-admin-dialog-fade">
      <div
        v-if="editFaqDialog"
        class="faq-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="faq-admin-dialog-backdrop"
          aria-label="Close edit FAQ dialog"
          @click="closeEditFaqDialog"
        />
        <div
          class="faq-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faq-admin-edit-faq-title"
        >
          <div class="faq-admin-dialog__card faq-admin-dialog__card--large">
            <div class="faq-admin-dialog__header">
              <h3 id="faq-admin-edit-faq-title" class="faq-admin-dialog__title">
                Edit FAQ
              </h3>
            </div>
            <form class="faq-admin-dialog__body" @submit.prevent="saveFaqEdits">
              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Topic</span>
                <select
                  v-model="editFaq.topicId"
                  class="faq-admin-field__control"
                >
                  <option value="">Select a topic</option>
                  <option
                    v-for="topic in topicOptions"
                    :key="`edit-${topic.id}`"
                    :value="topic.id"
                  >
                    {{ topic.title }}
                  </option>
                </select>
                <span v-if="formErrors.editFaq.topicId" class="faq-admin-field__error">
                  {{ formErrors.editFaq.topicId }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Locale</span>
                <select
                  v-model="editFaq.locale"
                  class="faq-admin-field__control"
                >
                  <option
                    v-for="localeOption in localeOptions"
                    :key="`edit-locale-${localeOption}`"
                    :value="localeOption"
                  >
                    {{ localeOption }}
                  </option>
                </select>
                <span v-if="formErrors.editFaq.locale" class="faq-admin-field__error">
                  {{ formErrors.editFaq.locale }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Question</span>
                <input
                  v-model="editFaq.question"
                  type="text"
                  class="faq-admin-field__control"
                >
                <span v-if="formErrors.editFaq.question" class="faq-admin-field__error">
                  {{ formErrors.editFaq.question }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Answer</span>
                <textarea
                  v-model="editFaq.answer"
                  rows="4"
                  class="faq-admin-field__control faq-admin-field__control--textarea"
                ></textarea>
                <span v-if="formErrors.editFaq.answer" class="faq-admin-field__error">
                  {{ formErrors.editFaq.answer }}
                </span>
              </label>

              <label class="faq-admin-checkbox">
                <input v-model="editFaq.isActive" type="checkbox">
                <span>Published</span>
              </label>

              <div class="faq-admin-field">
                <span class="faq-admin-field__label">
                  {{ $t("pages.admin.faq.translationStatus") }}
                </span>
                <div class="faq-admin-chip-list">
                  <span
                    v-for="localeOption in localeOptions"
                    :key="`edit-${editFaq.id}-${localeOption}`"
                    class="faq-admin-pill faq-admin-pill--locale"
                    :class="editFaq.translations?.[localeOption] ? 'faq-admin-pill--success' : 'faq-admin-pill--muted'"
                  >
                    {{ localeOption }}
                  </span>
                </div>
              </div>

              <div class="faq-admin-dialog__actions faq-admin-dialog__actions--spread">
                <button
                  type="button"
                  class="faq-admin-button"
                  @click="closeEditFaqDialog"
                >
                  Cancel
                </button>
                <div class="faq-admin-dialog__actions-group">
                  <button
                    type="button"
                    class="faq-admin-button"
                    :disabled="saving"
                    @click="translateMissing('entry', editFaq.id)"
                  >
                    <span v-if="saving" class="faq-admin-button__spinner" aria-hidden="true" />
                    {{ $t("pages.admin.faq.translateMissing") }}
                  </button>
                  <button
                    type="submit"
                    class="faq-admin-button faq-admin-button--primary"
                    :disabled="saving"
                  >
                    <span v-if="saving" class="faq-admin-button__spinner" aria-hidden="true" />
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="faq-admin-dialog-fade">
      <div
        v-if="translationDialog"
        class="faq-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="faq-admin-dialog-backdrop"
          aria-label="Close translation dialog"
          @click="closeTranslationDialog"
        />
        <div
          class="faq-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faq-admin-translation-title"
        >
          <div class="faq-admin-dialog__card faq-admin-dialog__card--medium">
            <div class="faq-admin-dialog__header">
              <h3 id="faq-admin-translation-title" class="faq-admin-dialog__title">
                {{ translationDialogTitle }}
              </h3>
            </div>
            <form class="faq-admin-dialog__body" @submit.prevent="saveTranslation">
              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Locale</span>
                <select
                  v-model="translationForm.locale"
                  class="faq-admin-field__control"
                >
                  <option
                    v-for="localeOption in localeOptions"
                    :key="`translation-${localeOption}`"
                    :value="localeOption"
                  >
                    {{ localeOption }}
                  </option>
                </select>
                <span v-if="formErrors.translation.locale" class="faq-admin-field__error">
                  {{ formErrors.translation.locale }}
                </span>
              </label>

              <label class="faq-admin-field">
                <span class="faq-admin-field__label">Title</span>
                <input
                  v-model="translationForm.title"
                  type="text"
                  class="faq-admin-field__control"
                >
                <span v-if="formErrors.translation.title" class="faq-admin-field__error">
                  {{ formErrors.translation.title }}
                </span>
              </label>

              <div class="faq-admin-dialog__actions">
                <button
                  type="button"
                  class="faq-admin-button"
                  @click="closeTranslationDialog"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="faq-admin-button faq-admin-button--primary"
                  :disabled="saving"
                >
                  <span v-if="saving" class="faq-admin-button__spinner" aria-hidden="true" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <div class="faq-admin-toast-stack" aria-live="polite" aria-atomic="true">
      <Transition name="faq-admin-toast-fade">
        <div
          v-if="snackbar.show"
          class="faq-admin-toast"
          :class="snackbar.color === 'error' ? 'faq-admin-toast--error' : 'faq-admin-toast--success'"
          role="status"
        >
          {{ snackbar.message }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const {
  getFaqGroups,
  getFaqGroupTranslations,
  getFaqTopics,
  getFaqTopicTranslations,
  getFaqEntries,
  getFaqTranslations,
  insertFaqGroup,
  insertFaqGroupTranslation,
  insertFaqTopic,
  insertFaqTopicTranslation,
  updateFaqTopicTranslation,
  updateFaqGroupTranslation,
  insertFaqEntry,
  insertFaqTranslation,
  updateFaqEntry,
  updateFaqTranslation,
  deleteFaqEntry,
  deleteFaqTopic,
} = useDb();

const { locale, localeProperties } = useI18n();

const topicSearch = ref("");
const opened = ref([]);
const activated = ref([]);
const loading = ref(false);
const saving = ref(false);

const groups = ref([]);
const groupTranslations = ref([]);
const topics = ref([]);
const topicTranslations = ref([]);
const entries = ref([]);
const entryTranslations = ref([]);

const newTopicDialog = ref(false);
const newGroupDialog = ref(false);
const newFaqDialog = ref(false);
const importFaqDialog = ref(false);
const editFaqDialog = ref(false);
const translationDialog = ref(false);

const newTopic = ref({
  groupId: null,
  title: "",
  slug: "",
  locale: "en-US",
  isActive: true,
});

const newGroup = ref({
  title: "",
  slug: "",
  locale: "en-US",
  isActive: true,
});

const newFaq = ref({
  topicId: null,
  question: "",
  answer: "",
  locale: "en-US",
  isActive: true,
});

const importFaq = ref({
  topicId: null,
  locale: "en-US",
  isActive: true,
  payload: "",
});

const editFaq = ref({
  id: null,
  topicId: null,
  question: "",
  answer: "",
  locale: "en-US",
  isActive: true,
});

const translationForm = ref({
  id: null,
  type: "topic",
  locale: "en-US",
  title: "",
});

const formErrors = ref({
  group: {},
  topic: {},
  faq: {},
  importFaq: {},
  editFaq: {},
  translation: {},
});

const snackbar = ref({
  show: false,
  color: "success",
  message: "",
});

const localeMap = {
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
};

const localeOptions = computed(() => ["en-US", "fr-FR", "ru-RU", "zh-CN"]);

const activeLocale = computed(() => {
  return (
    localeProperties.value?.iso ||
    localeMap[locale.value] ||
    locale.value ||
    "en-US"
  );
});

const localeList = computed(() => {
  const fallback = "en-US";
  return activeLocale.value === fallback
    ? [fallback]
    : [activeLocale.value, fallback];
});

const groupTranslationMap = computed(() => {
  const map = new Map();
  groupTranslations.value.forEach((translation) => {
    if (!map.has(translation.group_id)) {
      map.set(translation.group_id, {});
    }
    map.get(translation.group_id)[translation.locale] = translation.title;
  });
  return map;
});

const topicTranslationMap = computed(() => {
  const map = new Map();
  topicTranslations.value.forEach((translation) => {
    if (!map.has(translation.topic_id)) {
      map.set(translation.topic_id, {});
    }
    map.get(translation.topic_id)[translation.locale] = translation.title;
  });
  return map;
});

const entryTranslationMap = computed(() => {
  const map = new Map();
  entryTranslations.value.forEach((translation) => {
    if (!map.has(translation.entry_id)) {
      map.set(translation.entry_id, {});
    }
    map.get(translation.entry_id)[translation.locale] = {
      question: translation.question,
      answer: translation.answer,
    };
  });
  return map;
});

const pickTranslation = (translationMap, id, field) => {
  const translations = translationMap.get(id) || {};
  return (
    translations[activeLocale.value]?.[field] ||
    translations["en-US"]?.[field] ||
    ""
  );
};

const pickTitle = (translationMap, id, fallback) => {
  const translations = translationMap.get(id) || {};
  return translations[activeLocale.value] || translations["en-US"] || fallback;
};

const groupsWithTitles = computed(() =>
  groups.value.map((group) => ({
    ...group,
    title: pickTitle(groupTranslationMap.value, group.id, group.slug),
  }))
);

const topicsWithTitles = computed(() =>
  topics.value.map((topic) => ({
    ...topic,
    title: pickTitle(topicTranslationMap.value, topic.id, topic.slug),
  }))
);

const groupIconMap = {
  "getting-started": "🚀",
  "chat-tools": "💬",
  "safety-privacy": "🛡️",
  "language-practice": "🌐",
  community: "👥",
};

const treeItems = computed(() => {
  const term = topicSearch.value.trim().toLowerCase();
  const items = [];

  groupsWithTitles.value.forEach((group) => {
    const children = topicsWithTitles.value
      .filter((topic) => topic.group_id === group.id)
      .filter((topic) =>
        term ? topic.title.toLowerCase().includes(term) : true
      )
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
        type: "topic",
      }));

    const matchesGroup = term
      ? group.title.toLowerCase().includes(term)
      : true;

    if (!children.length && !matchesGroup) return;

    items.push({
      id: group.id,
      title: group.title,
      icon: groupIconMap[group.slug] || "📁",
      type: "group",
      children,
    });
  });

  return items;
});

const groupOptions = computed(() => groupsWithTitles.value);

const topicOptions = computed(() =>
  topicsWithTitles.value
    .map((topic) => ({
      ...topic,
      title: topic.title,
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
);

const tableRows = computed(() => {
  const activeFilter = activated.value[0];
  const filtered = entries.value.filter((entry) => {
    if (!activeFilter) return true;
    const topic = topicsWithTitles.value.find(
      (item) => item.id === entry.topic_id
    );
    if (!topic) return false;
    return topic.id === activeFilter || topic.group_id === activeFilter;
  });

  return filtered.map((entry) => {
    const topic = topicsWithTitles.value.find(
      (item) => item.id === entry.topic_id
    );
    const translationLocales =
      entryTranslationMap.value.get(entry.id) || {};
    return {
      id: entry.id,
      topicId: entry.topic_id,
      question: pickTranslation(entryTranslationMap.value, entry.id, "question"),
      answer: pickTranslation(entryTranslationMap.value, entry.id, "answer"),
      topicTitle: topic?.title || "Unknown",
      slug: entry.slug || "",
      isActive: entry.is_active,
      sortOrder: entry.sort_order ?? 0,
      translations: localeOptions.value.reduce((acc, localeOption) => {
        acc[localeOption] = Boolean(translationLocales[localeOption]);
        return acc;
      }, {}),
    };
  });
});

const translationDialogTitle = computed(() =>
  translationForm.value.type === "group"
    ? "Edit group translation"
    : "Edit topic translation"
);

const slugify = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/^-+|-+$/g, "");

let snackbarTimer = null;

const showMessage = (message, color = "success") => {
  snackbar.value = {
    show: true,
    color,
    message,
  };
};

const resetFormErrors = (formKey) => {
  formErrors.value[formKey] = {};
};

const validateForm = (formKey) => {
  const errors = {};

  if (formKey === "group") {
    if (!String(newGroup.value.locale || "").trim()) {
      errors.locale = "Locale is required.";
    }
    if (!String(newGroup.value.title || "").trim()) {
      errors.title = "Title is required.";
    }
  }

  if (formKey === "topic") {
    if (!String(newTopic.value.groupId || "").trim()) {
      errors.groupId = "Group is required.";
    }
    if (!String(newTopic.value.locale || "").trim()) {
      errors.locale = "Locale is required.";
    }
    if (!String(newTopic.value.title || "").trim()) {
      errors.title = "Title is required.";
    }
  }

  if (formKey === "faq") {
    if (!String(newFaq.value.topicId || "").trim()) {
      errors.topicId = "Topic is required.";
    }
    if (!String(newFaq.value.locale || "").trim()) {
      errors.locale = "Locale is required.";
    }
    if (!String(newFaq.value.question || "").trim()) {
      errors.question = "Question is required.";
    }
    if (!String(newFaq.value.answer || "").trim()) {
      errors.answer = "Answer is required.";
    }
  }

  if (formKey === "importFaq") {
    if (!String(importFaq.value.topicId || "").trim()) {
      errors.topicId = "Topic is required.";
    }
    if (!String(importFaq.value.locale || "").trim()) {
      errors.locale = "Locale is required.";
    }
    if (!String(importFaq.value.payload || "").trim()) {
      errors.payload = "JSON is required.";
    }
  }

  if (formKey === "editFaq") {
    if (!String(editFaq.value.topicId || "").trim()) {
      errors.topicId = "Topic is required.";
    }
    if (!String(editFaq.value.locale || "").trim()) {
      errors.locale = "Locale is required.";
    }
    if (!String(editFaq.value.question || "").trim()) {
      errors.question = "Question is required.";
    }
    if (!String(editFaq.value.answer || "").trim()) {
      errors.answer = "Answer is required.";
    }
  }

  if (formKey === "translation") {
    if (!String(translationForm.value.locale || "").trim()) {
      errors.locale = "Locale is required.";
    }
    if (!String(translationForm.value.title || "").trim()) {
      errors.title = "Title is required.";
    }
  }

  formErrors.value[formKey] = errors;
  return !Object.keys(errors).length;
};

const closeNewGroupDialog = () => {
  newGroupDialog.value = false;
  resetFormErrors("group");
};

const closeNewTopicDialog = () => {
  newTopicDialog.value = false;
  resetFormErrors("topic");
};

const closeNewFaqDialog = () => {
  newFaqDialog.value = false;
  resetFormErrors("faq");
};

const closeImportFaqDialog = () => {
  importFaqDialog.value = false;
  resetFormErrors("importFaq");
};

const closeEditFaqDialog = () => {
  editFaqDialog.value = false;
  resetFormErrors("editFaq");
};

const closeTranslationDialog = () => {
  translationDialog.value = false;
  resetFormErrors("translation");
};

const refreshData = async () => {
  loading.value = true;
  try {
    const [groupsData, topicsData, entriesData] = await Promise.all([
      getFaqGroups(),
      getFaqTopics(),
      getFaqEntries(),
    ]);

    const locales = localeOptions.value;
    const [
      groupTranslationsData,
      topicTranslationsData,
      entryTranslationsData,
    ] = await Promise.all([
      getFaqGroupTranslations(locales),
      getFaqTopicTranslations(locales),
      getFaqTranslations(locales),
    ]);

    groups.value = groupsData || [];
    topics.value = topicsData || [];
    entries.value = entriesData || [];
    groupTranslations.value = groupTranslationsData || [];
    topicTranslations.value = topicTranslationsData || [];
    entryTranslations.value = entryTranslationsData || [];

    if (!opened.value.length && groups.value.length) {
      opened.value = [groups.value[0].id];
    }
  } finally {
    loading.value = false;
  }
};

const iconFor = (item) => {
  if (item.type === "group") {
    return item.icon || "📁";
  }
  return "•";
};

const isGroupOpen = (groupId) =>
  Boolean(topicSearch.value.trim()) || opened.value.includes(groupId);

const toggleGroup = (groupId) => {
  if (opened.value.includes(groupId)) {
    opened.value = opened.value.filter((id) => id !== groupId);
    return;
  }

  opened.value = [...opened.value, groupId];
};

const selectTreeItem = (item) => {
  activated.value = [item.id];
  if (item.type === "group" && !opened.value.includes(item.id)) {
    opened.value = [...opened.value, item.id];
  }
};

const openNewTopic = () => {
  const activeFilter = activated.value[0];
  const activeGroup = groups.value.find((group) => group.id === activeFilter);
  const activeTopic = topics.value.find((topic) => topic.id === activeFilter);
  newTopic.value = {
    groupId: activeGroup?.id || activeTopic?.group_id || groups.value[0]?.id || null,
    title: "",
    slug: "",
    locale: "en-US",
    isActive: true,
  };
  resetFormErrors("topic");
  newTopicDialog.value = true;
};

const openNewGroup = () => {
  newGroup.value = {
    title: "",
    slug: "",
    locale: "en-US",
    isActive: true,
  };
  resetFormErrors("group");
  newGroupDialog.value = true;
};

const openNewFaq = () => {
  newFaq.value = {
    topicId: topics.value[0]?.id || null,
    question: "",
    answer: "",
    locale: "en-US",
    isActive: true,
  };
  resetFormErrors("faq");
  newFaqDialog.value = true;
};

const openImportFaqDialog = () => {
  importFaq.value = {
    topicId: topics.value[0]?.id || null,
    locale: "en-US",
    isActive: true,
    payload: "",
  };
  resetFormErrors("importFaq");
  importFaqDialog.value = true;
};

const createGroup = async () => {
  if (!validateForm("group")) return;

  saving.value = true;
  try {
    const slug = newGroup.value.slug || slugify(newGroup.value.title);
    const nextSort =
      Math.max(0, ...groups.value.map((group) => group.sort_order || 0)) + 1;
    const { data, error } = await insertFaqGroup({
      slug,
      sort_order: nextSort,
      is_active: newGroup.value.isActive,
    });

    if (error) throw error;

    const translationError = await insertFaqGroupTranslation({
      group_id: data.id,
      locale: newGroup.value.locale || "en-US",
      title: newGroup.value.title,
    });

    if (translationError?.error) throw translationError.error;

    closeNewGroupDialog();
    opened.value = [data.id];
    activated.value = [data.id];
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to create group.", "error");
  } finally {
    saving.value = false;
  }
};

const createTopic = async () => {
  if (!validateForm("topic")) return;

  saving.value = true;
  try {
    const slug = newTopic.value.slug || slugify(newTopic.value.title);
    const { data, error } = await insertFaqTopic({
      group_id: newTopic.value.groupId,
      slug,
      sort_order: 0,
      is_active: newTopic.value.isActive,
    });

    if (error) throw error;

    const translationError = await insertFaqTopicTranslation({
      topic_id: data.id,
      locale: newTopic.value.locale || "en-US",
      title: newTopic.value.title,
    });

    if (translationError?.error) throw translationError.error;

    closeNewTopicDialog();
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to create topic.", "error");
  } finally {
    saving.value = false;
  }
};

const createFaq = async () => {
  if (!validateForm("faq")) return;

  saving.value = true;
  try {
    const topicEntries = entries.value.filter(
      (entry) => entry.topic_id === newFaq.value.topicId
    );
    const nextSort =
      Math.max(0, ...topicEntries.map((entry) => entry.sort_order || 0)) + 1;

    const { data, error } = await insertFaqEntry({
      topic_id: newFaq.value.topicId,
      sort_order: nextSort,
      is_active: newFaq.value.isActive,
    });

    if (error) throw error;

    const translationError = await insertFaqTranslation({
      entry_id: data.id,
      locale: newFaq.value.locale || "en-US",
      question: newFaq.value.question,
      answer: newFaq.value.answer,
    });

    if (translationError?.error) throw translationError.error;

    closeNewFaqDialog();
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to create FAQ.", "error");
  } finally {
    saving.value = false;
  }
};

const parseFaqImportPayload = (value) => {
  const parsed = JSON.parse(String(value || "").trim());
  const rawItems = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.faqs)
      ? parsed.faqs
      : null;

  if (!rawItems) {
    throw new Error("JSON must be an array or an object with a faqs array.");
  }

  const items = rawItems
    .map((item) => ({
      question: String(item?.question || "").trim(),
      answer: String(item?.answer || "").trim(),
    }))
    .filter((item) => item.question && item.answer);

  if (!items.length) {
    throw new Error("No valid FAQ items were found in the JSON payload.");
  }

  return items;
};

const importFaqs = async () => {
  if (!validateForm("importFaq")) return;

  saving.value = true;
  try {
    const items = parseFaqImportPayload(importFaq.value.payload);
    const topicEntries = entries.value.filter(
      (entry) => entry.topic_id === importFaq.value.topicId
    );
    let nextSort =
      Math.max(0, ...topicEntries.map((entry) => entry.sort_order || 0)) + 1;

    for (const item of items) {
      const { data, error } = await insertFaqEntry({
        topic_id: importFaq.value.topicId,
        sort_order: nextSort,
        is_active: importFaq.value.isActive,
      });

      if (error) throw error;

      const translationError = await insertFaqTranslation({
        entry_id: data.id,
        locale: importFaq.value.locale || "en-US",
        question: item.question,
        answer: item.answer,
      });

      if (translationError?.error) throw translationError.error;
      nextSort += 1;
    }

    closeImportFaqDialog();
    showMessage(`Imported ${items.length} FAQ${items.length === 1 ? "" : "s"}.`);
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to import FAQs.", "error");
  } finally {
    saving.value = false;
  }
};

const openEditFaq = (row) => {
  editFaq.value = {
    id: row.id,
    topicId: row.topicId,
    question: row.question,
    answer: row.answer,
    locale: "en-US",
    isActive: row.isActive,
    translations: row.translations,
  };
  resetFormErrors("editFaq");
  editFaqDialog.value = true;
};

const saveFaqEdits = async () => {
  if (!validateForm("editFaq")) return;

  saving.value = true;
  try {
    const entryError = await updateFaqEntry(editFaq.value.id, {
      topic_id: editFaq.value.topicId,
      is_active: editFaq.value.isActive,
    });
    if (entryError) throw entryError;

    const translationError = await updateFaqTranslation(
      editFaq.value.id,
      editFaq.value.locale || "en-US",
      {
        question: editFaq.value.question,
        answer: editFaq.value.answer,
      }
    );
    if (translationError) throw translationError;

    closeEditFaqDialog();
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to update FAQ.", "error");
  } finally {
    saving.value = false;
  }
};

const removeFaq = async (row) => {
  if (!confirm("Delete this FAQ?")) return;
  saving.value = true;
  try {
    const error = await deleteFaqEntry(row.id);
    if (error) throw error;
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to delete FAQ.", "error");
  } finally {
    saving.value = false;
  }
};

const removeTopic = async (item) => {
  const entryCount = entries.value.filter(
    (entry) => entry.topic_id === item.id
  ).length;
  const warning =
    entryCount > 0
      ? ` This will also permanently delete ${entryCount} FAQ${entryCount === 1 ? "" : "s"} inside it.`
      : "";
  if (!confirm(`Delete topic "${item.title}"?${warning}`)) return;
  saving.value = true;
  try {
    const error = await deleteFaqTopic(item.id);
    if (error) throw error;
    if (activated.value[0] === item.id) activated.value = [];
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to delete topic.", "error");
  } finally {
    saving.value = false;
  }
};

const copyFaqLink = async (row) => {
  const slug = row.slug;
  if (!slug) {
    showMessage("Add a slug to generate a link.", "error");
    return;
  }
  if (typeof window === "undefined") return;
  const link = `${window.location.origin}/faq#${slug}`;
  try {
    await navigator.clipboard.writeText(link);
    showMessage("FAQ link copied.");
  } catch {
    showMessage(link);
  }
};

const openTranslationDialog = (item) => {
  const isGroup = item.type === "group";
  const translationMap = isGroup
    ? groupTranslationMap.value
    : topicTranslationMap.value;
  translationForm.value = {
    id: item.id,
    type: isGroup ? "group" : "topic",
    locale: "en-US",
    title: pickTitle(translationMap, item.id, item.title),
  };
  resetFormErrors("translation");
  translationDialog.value = true;
};

const saveTranslation = async () => {
  if (!validateForm("translation")) return;

  saving.value = true;
  try {
    if (translationForm.value.type === "group") {
      const error = await updateFaqGroupTranslation(
        translationForm.value.id,
        translationForm.value.locale,
        { title: translationForm.value.title }
      );
      if (error) throw error;
    } else {
      const error = await updateFaqTopicTranslation(
        translationForm.value.id,
        translationForm.value.locale,
        { title: translationForm.value.title }
      );
      if (error) throw error;
    }
    closeTranslationDialog();
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to update translation.", "error");
  } finally {
    saving.value = false;
  }
};

const translateMissing = async (type, id) => {
  if (!id) return;
  saving.value = true;
  try {
    const payload = {
      type,
      id,
      sourceLocale: "en-US",
      targetLocales: localeOptions.value.filter((locale) => locale !== "en-US"),
    };
    const response = await $fetch("/api/admin/faq/translate", {
      method: "POST",
      body: payload,
    });
    if (!response?.success) {
      throw new Error(response?.error || "Translation failed.");
    }
    await refreshData();
  } catch (err) {
    showMessage(err?.message || "Failed to translate.", "error");
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await refreshData();
});

watch(localeList, async () => {
  await refreshData();
});

watch(
  () => editFaq.value.locale,
  (nextLocale) => {
    if (!editFaq.value.id || !nextLocale) return;
    const translation =
      entryTranslationMap.value.get(editFaq.value.id)?.[nextLocale];
    if (translation) {
      editFaq.value.question = translation.question || "";
      editFaq.value.answer = translation.answer || "";
    } else if (nextLocale === "en-US") {
      editFaq.value.question =
        pickTranslation(entryTranslationMap.value, editFaq.value.id, "question");
      editFaq.value.answer =
        pickTranslation(entryTranslationMap.value, editFaq.value.id, "answer");
    } else {
      editFaq.value.question = "";
      editFaq.value.answer = "";
    }
  }
);

watch(
  () => translationForm.value.locale,
  (nextLocale) => {
    if (!translationForm.value.id || !nextLocale) return;
    const translationMap =
      translationForm.value.type === "group"
        ? groupTranslationMap.value
        : topicTranslationMap.value;
    translationForm.value.title = pickTitle(
      translationMap,
      translationForm.value.id,
      ""
    );
  }
);

watch(
  () => snackbar.value.show,
  (isVisible) => {
    if (snackbarTimer) {
      clearTimeout(snackbarTimer);
      snackbarTimer = null;
    }

    if (!isVisible) return;

    snackbarTimer = setTimeout(() => {
      snackbar.value.show = false;
      snackbarTimer = null;
    }, 3500);
  }
);

onBeforeUnmount(() => {
  if (snackbarTimer) {
    clearTimeout(snackbarTimer);
  }
});
</script>

<style scoped>
.faq-admin-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.faq-admin-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.faq-admin-card__body {
  padding: 20px 22px 22px;
}

.faq-admin-kicker {
  color: rgba(var(--color-text), 0.6);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.faq-admin-title {
  margin: 6px 0 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.faq-admin-subtitle {
  margin: 8px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.faq-admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.faq-admin-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.faq-admin-panel {
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.72);
  padding: 16px;
}

.faq-admin-panel__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.faq-admin-panel__header--between {
  justify-content: space-between;
}

.faq-admin-panel__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 0.98rem;
  font-weight: 700;
}

.faq-admin-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.faq-admin-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.faq-admin-field__control {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  color-scheme: light dark;
}

.faq-admin-field__control--textarea {
  min-height: 132px;
  resize: vertical;
}

.faq-admin-field__error {
  color: rgb(185, 28, 28);
  font-size: 0.8rem;
}

.faq-admin-button,
.faq-admin-icon-button,
.faq-admin-search__clear,
.faq-admin-tree__toggle,
.faq-admin-tree__item-button {
  appearance: none;
  border: none;
  font: inherit;
}

.faq-admin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.92);
  color: rgb(var(--color-text));
  padding: 0 16px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
}

.faq-admin-button--primary {
  border-color: rgba(var(--color-primary), 0.3);
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.faq-admin-button:disabled,
.faq-admin-icon-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.faq-admin-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: faq-admin-spin 0.8s linear infinite;
}

.faq-admin-search {
  position: relative;
}

.faq-admin-search__input {
  width: 100%;
  padding-right: 42px;
}

.faq-admin-search__clear {
  position: absolute;
  top: 50%;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(var(--color-surface-elevated), 0.88);
  color: rgba(var(--color-text), 0.72);
  cursor: pointer;
  transform: translateY(-50%);
}

.faq-admin-skeleton-list {
  display: grid;
  gap: 10px;
}

.faq-admin-skeleton {
  display: block;
  border-radius: 14px;
  background:
    linear-gradient(90deg, rgba(var(--color-border), 0.42), rgba(var(--color-border), 0.18), rgba(var(--color-border), 0.42));
  background-size: 220% 100%;
  animation: faq-admin-pulse 1.3s ease-in-out infinite;
}

.faq-admin-skeleton--row {
  height: 42px;
}

.faq-admin-skeleton--table {
  height: 56px;
}

.faq-admin-tree {
  display: grid;
  gap: 10px;
}

.faq-admin-tree__group {
  display: grid;
  gap: 8px;
}

.faq-admin-tree__row {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 16px;
  border: 1px solid rgba(var(--color-border), 0.78);
  background: rgba(var(--color-surface-elevated), 0.58);
  padding: 6px;
}

.faq-admin-tree__row.is-active {
  border-color: rgba(var(--color-primary), 0.38);
  background: rgba(var(--color-primary), 0.1);
}

.faq-admin-tree__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: transparent;
  color: rgba(var(--color-text), 0.78);
  cursor: pointer;
}

.faq-admin-tree__toggle-icon {
  font-size: 0.9rem;
}

.faq-admin-tree__item-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  background: transparent;
  color: rgb(var(--color-text));
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.faq-admin-tree__item-button--topic {
  padding-left: 10px;
}

.faq-admin-tree__icon {
  display: inline-flex;
  width: 20px;
  justify-content: center;
  font-size: 0.95rem;
}

.faq-admin-tree__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.faq-admin-tree__actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.faq-admin-tree__children {
  display: grid;
  gap: 8px;
  padding-left: 18px;
}

.faq-admin-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.82);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 0 10px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.faq-admin-icon-button--danger {
  border-color: rgba(239, 68, 68, 0.24);
  color: rgb(185, 28, 28);
  background: rgba(239, 68, 68, 0.1);
}

.faq-admin-empty-state {
  margin: 0;
  border-radius: 16px;
  border: 1px dashed rgba(var(--color-border), 0.82);
  padding: 16px;
  color: rgba(var(--color-text), 0.68);
  font-size: 0.9rem;
  text-align: center;
}

.faq-admin-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface-elevated), 0.82);
  color: rgba(var(--color-text), 0.82);
}

.faq-admin-pill--primary {
  border-color: rgba(var(--color-primary), 0.28);
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.faq-admin-pill--success {
  border-color: rgba(34, 197, 94, 0.26);
  background: rgba(34, 197, 94, 0.14);
  color: rgb(21, 128, 61);
}

.faq-admin-pill--warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.14);
  color: rgb(146, 64, 14);
}

.faq-admin-pill--muted {
  color: rgba(var(--color-text), 0.62);
}

.faq-admin-pill--locale {
  text-transform: none;
}

.faq-admin-chip-list,
.faq-admin-action-list,
.faq-admin-dialog__actions-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.faq-admin-table-wrap {
  overflow-x: auto;
}

.faq-admin-table {
  width: 100%;
  border-collapse: collapse;
}

.faq-admin-table th,
.faq-admin-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--color-border), 0.72);
  text-align: left;
  vertical-align: top;
}

.faq-admin-table th {
  color: rgba(var(--color-text), 0.62);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.faq-admin-table__actions-heading {
  text-align: right;
}

.faq-admin-table td:last-child {
  text-align: right;
}

.faq-admin-table__empty {
  color: rgba(var(--color-text), 0.68);
  text-align: center !important;
  padding: 28px 14px !important;
}

.faq-admin-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.faq-admin-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(15, 23, 42, 0.46);
  cursor: pointer;
}

.faq-admin-dialog {
  position: relative;
  z-index: 1;
  width: min(100%, 760px);
}

.faq-admin-dialog__card {
  border-radius: 24px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.98), rgba(var(--color-surface), 0.98));
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.faq-admin-dialog__card--medium {
  max-width: 520px;
}

.faq-admin-dialog__card--large {
  max-width: 640px;
}

.faq-admin-dialog__card--xlarge {
  max-width: 760px;
}

.faq-admin-dialog__header {
  padding: 22px 22px 0;
}

.faq-admin-dialog__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.06rem;
  font-weight: 700;
}

.faq-admin-dialog__body {
  display: grid;
  gap: 16px;
  padding: 18px 22px 22px;
}

.faq-admin-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.faq-admin-dialog__actions--spread {
  justify-content: space-between;
  align-items: center;
}

.faq-admin-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: rgb(var(--color-text));
  font-size: 0.92rem;
  font-weight: 500;
}

.faq-admin-checkbox input {
  width: 16px;
  height: 16px;
}

.faq-admin-note {
  border-radius: 16px;
  border: 1px solid rgba(var(--color-primary), 0.24);
  background: rgba(var(--color-primary), 0.08);
  color: rgba(var(--color-text), 0.82);
  padding: 12px 14px;
  font-size: 0.88rem;
}

.faq-admin-note code {
  font-size: 0.82rem;
  word-break: break-word;
}

.faq-admin-toast-stack {
  position: fixed;
  top: 20px;
  left: 50%;
  z-index: 1500;
  transform: translateX(-50%);
  pointer-events: none;
}

.faq-admin-toast {
  min-width: min(90vw, 260px);
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  font-size: 0.92rem;
  font-weight: 600;
}

.faq-admin-toast--success {
  background: rgba(22, 163, 74, 0.96);
  color: #fff;
}

.faq-admin-toast--error {
  background: rgba(185, 28, 28, 0.96);
  color: #fff;
}

.faq-admin-dialog-fade-enter-active,
.faq-admin-dialog-fade-leave-active,
.faq-admin-toast-fade-enter-active,
.faq-admin-toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.faq-admin-dialog-fade-enter-from,
.faq-admin-dialog-fade-leave-to,
.faq-admin-toast-fade-enter-from,
.faq-admin-toast-fade-leave-to {
  opacity: 0;
}

.faq-admin-dialog-fade-enter-from .faq-admin-dialog,
.faq-admin-dialog-fade-leave-to .faq-admin-dialog {
  transform: translateY(10px) scale(0.98);
}

.faq-admin-toast-fade-enter-from,
.faq-admin-toast-fade-leave-to {
  transform: translateY(-8px);
}

@keyframes faq-admin-pulse {
  0% {
    background-position: 100% 50%;
  }

  100% {
    background-position: -100% 50%;
  }
}

@keyframes faq-admin-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 960px) {
  .faq-admin-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
  }
}

@media (max-width: 720px) {
  .faq-admin-card__header,
  .faq-admin-card__body,
  .faq-admin-dialog__header,
  .faq-admin-dialog__body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .faq-admin-dialog-layer {
    padding: 16px;
  }

  .faq-admin-dialog__actions--spread {
    justify-content: flex-end;
  }

  .faq-admin-table th,
  .faq-admin-table td {
    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
