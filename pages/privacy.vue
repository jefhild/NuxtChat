<template>
  <div class="legal-page legal-page--privacy mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
    <div>
      <h1>{{ $t("pages.privacy.title") }}</h1>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.intro") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.privacy.information-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.information-text1") }}
      </p>
      <ul class="legal-list">
        <li>{{ $t("pages.privacy.information-text2") }}</li>
        <li>{{ $t("pages.privacy.information-text3") }}</li>
        <li>{{ $t("pages.privacy.information-text4") }}</li>
        <li>{{ $t("pages.privacy.information-text5") }}</li>
      </ul>
    </section>
    <section>
      <h4>{{ $t("pages.privacy.how-we-use-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.how-we-use-intro") }}
      </p>

      <ul class="legal-list">
        <li>
          <strong>{{ $t("pages.privacy.registration-title") }}</strong>
          {{ $t("pages.privacy.registration-intro") }}
        </li>
        <li>{{ $t("pages.privacy.registration-text") }}</li>
        <li>
          <strong>{{ $t("pages.privacy.content-title") }}</strong>
          {{ $t("pages.privacy.content-text") }}
        </li>
        <li>
          <strong>{{ $t("pages.privacy.customer-service-title") }}</strong>
          {{ $t("pages.privacy.customer-service-text") }}
        </li>
        <li>
          <strong>{{ $t("pages.privacy.log-information-title") }}</strong>
          {{ $t("pages.privacy.log-information-text") }}
        </li>
      </ul>
    </section>
    <section>
      <h4>{{ $t("pages.privacy.to-whom-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.to-whom-text1") }}
      </p>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.to-whom-text2") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.to-whom-text3") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.to-whom-text4") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.privacy.how-we-protect-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.how-we-protect-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.privacy.how-long-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.how-long-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.privacy.what-are-cookies-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.what-are-cookies-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.privacy.gdpr-compliance-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.gdpr-compliance-intro") }}
      </p>
    </section>
    <section>
      <p class="legal-copy">
        {{ $t("pages.privacy.gdpr-compliance-text1") }}
      </p>
      <ul class="legal-list">
        <li>{{ $t("pages.privacy.gdpr-compliance-text2") }}</li>
        <li>{{ $t("pages.privacy.gdpr-compliance-text3") }}</li>
        <li>{{ $t("pages.privacy.gdpr-compliance-text4") }}</li>
        <li>{{ $t("pages.privacy.gdpr-compliance-text5") }}</li>
        <li>{{ $t("pages.privacy.gdpr-compliance-text6") }}</li>
      </ul>
    </section>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.gdpr-compliance-text7") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.gdpr-compliance-text8") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.gdpr-compliance-text9") }} help@imchatty.com
        {{ $t("pages.privacy.gdpr-compliance-text10") }}
      </p>
    </div>
    <div>
      <p class="legal-copy">
        {{ $t("pages.privacy.gdpr-compliance-text11") }}
      </p>
    </div>
    <section>
      <h4>{{ $t("pages.privacy.how-far-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.how-far-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.privacy.privacy-modified-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.privacy-modified-text") }}
      </p>
    </section>
    <section>
      <h4>{{ $t("pages.privacy.rights-contact-title") }}</h4>
      <p class="legal-copy">
        {{ $t("pages.privacy.rights-contact-text1") }}help@imchatty.com.
        {{ $t("pages.privacy.rights-contact-text2") }}
      </p>
    </section>
  </div>
</template>

<script setup>
useSeoI18nMeta("privacy");
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

.legal-list strong {
  font-weight: 650;
  color: rgb(var(--color-foreground) / 0.88);
}
</style>
