<template>
  <div class="legal-page legal-page--terms mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
    <div>
      <h1>{{ $t("pages.terms.page.title") }}</h1>
      <!-- <p class="legal-copy">
        These are the terms and conditions of our website.
      </p> -->
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.intro") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.intro-2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.intro-3") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.terms.page.service-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.service-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.acquisition-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.acquisition-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.use-of-service-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.use-of-service-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.eligibility-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.eligibility-text") }}
      </p>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.eligibility-text-2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.eligibility-text-3") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.eligibility-text-4") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.terms.page.registration-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.registration-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.member-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.member-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.privacy-policy-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.privacy-policy-text") }}
      </p>
    </section>
    <section class="pl-5">
      <h5>{{ $t("pages.terms.page.gpdr-title") }}</h5>
      <p class="legal-copy">
        {{ $t("pages.terms.page.gpdr-text1") }}
        help@imchatty.com {{ $t("pages.terms.page.gpdr-text2") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.billing-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.billing-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.member-conduct-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.member-conduct-text") }}
      </p>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.member-conduct-text-2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.member-conduct-text-3") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.member-conduct-text-4") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.member-conduct-text-5") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.member-conduct-text-6") }}
      </p>
    </div>
    <section>
      <h4>
        {{ $t("pages.terms.page.ownership-title") }}
      </h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.ownership-text") }}
      </p>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.ownership-text-2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.ownership-text-3") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.terms.page.indemnity-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.indemnity-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.general-practices-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-practices-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.modifications-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.modifications-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.termination-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.termination-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.dealings-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.dealings-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.property-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.property-text") }}
      </p>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.property-text-2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.property-text-3") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.terms.page.disclaimer-title") }}</h4>
      <ul class="legal-list">
        <li>{{ $t("pages.terms.page.disclaimer-text") }}</li>
        <li>{{ $t("pages.terms.page.disclaimer-text-2") }}</li>
        <li>{{ $t("pages.terms.page.disclaimer-text-3") }}</li>
        <li>{{ $t("pages.terms.page.disclaimer-text-4") }}</li>
      </ul>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.limitation-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.limitation-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.exclusions-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.exclusions-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.terms.page.general-info-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text") }}
      </p>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text-2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text-3") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text-4") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text-5") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text-6") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text-7") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.general-info-text-8") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.terms.page.accepting-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.accepting-text") }}
      </p>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.accepting-text-2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.accepting-text-3") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.terms.page.accepting-text-4") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.terms.page.amendments-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.terms.page.amendments-text") }}
      </p>
    </section>
  </div>
</template>

<script setup>
useSeoI18nMeta("terms");
</script>

<style scoped>
.legal-page {
  color: rgb(var(--color-foreground));
}

.legal-page h1 {
  margin: 0 0 1rem;
  font-size: clamp(1.85rem, 2vw + 1rem, 2.45rem);
  line-height: 1.2;
}

.legal-page section,
.legal-page > div {
  margin-bottom: 1rem;
}

.legal-page h4 {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.4;
}

.legal-page h5 {
  margin: 0 0 0.35rem;
  font-size: 0.96rem;
  font-weight: 650;
  line-height: 1.4;
}

.legal-copy {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.65;
  color: rgb(var(--color-foreground) / 0.78);
}

.legal-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.95rem;
  line-height: 1.65;
  color: rgb(var(--color-foreground) / 0.78);
}

.legal-list li + li {
  margin-top: 0.4rem;
}
</style>
