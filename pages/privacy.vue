<template>
  <v-container class="legal-page legal-page--privacy">
    <v-row
      ><v-col
        ><h1>{{ $t("pages.privacy.title") }}</h1></v-col
      ></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.intro") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col>
        <h4>{{ $t("pages.privacy.information-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.information-text1") }}
        </p>
        <v-list density="compact" class="text-subtitle-2">
          <v-list-item>{{ $t("pages.privacy.information-text2") }}</v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.information-text3") }}
          </v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.information-text4") }}
          </v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.information-text5") }}
          </v-list-item>
        </v-list>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.how-we-use-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.how-we-use-intro") }}
        </p>

        <v-list density="compact" class="text-subtitle-2">
          <v-list-item :title="$t('pages.privacy.registration-title')"
            >{{ $t("pages.privacy.registration-intro") }}
          </v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.registration-text") }}
          </v-list-item>
          <v-list-item :title="$t('pages.privacy.content-title')">
            {{ $t("pages.privacy.content-text") }}
          </v-list-item>
          <v-list-item :title="$t('pages.privacy.customer-service-title')">
            {{ $t("pages.privacy.customer-service-text") }}
          </v-list-item>
          <v-list-item :title="$t('pages.privacy.log-information-title')">
            {{ $t("pages.privacy.log-information-text") }}
          </v-list-item>
        </v-list>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.to-whom-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.to-whom-text1") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.to-whom-text2") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.to-whom-text3") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.to-whom-text4") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.how-we-protect-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.how-we-protect-text") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.how-long-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.how-long-text") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.what-are-cookies-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.what-are-cookies-text") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.gdpr-compliance-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.gdpr-compliance-intro") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.gdpr-compliance-text1") }}
        </p>
        <v-list density="compact" class="text-subtitle-2">
          <v-list-item>
            {{ $t("pages.privacy.gdpr-compliance-text2") }}
          </v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.gdpr-compliance-text3") }}
          </v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.gdpr-compliance-text4") }}
          </v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.gdpr-compliance-text5") }}
          </v-list-item>
          <v-list-item>
            {{ $t("pages.privacy.gdpr-compliance-text6") }}
          </v-list-item>
        </v-list>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.gdpr-compliance-text7") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.gdpr-compliance-text8") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.gdpr-compliance-text9") }} help@imchatty.com
          {{ $t("pages.privacy.gdpr-compliance-text10") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><p class="text-body-2">
          {{ $t("pages.privacy.gdpr-compliance-text11") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.how-far-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.how-far-text") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.privacy-modified-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.privacy-modified-text") }}
        </p>
      </v-col></v-row
    >
    <v-row
      ><v-col
        ><h4>{{ $t("pages.privacy.rights-contact-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.privacy.rights-contact-text1") }}help@imchatty.com.
          {{ $t("pages.privacy.rights-contact-text2") }}
        </p>
      </v-col></v-row
    >
  </v-container>
</template>

<script setup>
useSeoI18nMeta("privacy");
</script>
