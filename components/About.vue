<template>
  <v-container>
    <v-row>
      <v-col>
        <h4>A {{ $t("pages.about.page.welcome-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.about.page.welcome-text") }}
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <h4>{{ $t("pages.about.page.who_we_are-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.about.page.who_we_are-text1") }}
          <a href="https://oliverwjones.com" target="_blank" rel="noopener">Oliver W. Jones</a>,
          {{ $t("pages.about.page.who_we_are-text2") }}
          <a href="https://github.com/jefhild/NuxtChat" target="_blank" rel="noopener">
            {{ $t("pages.about.page.who_we_are-text3") }}
          </a>.
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <h4>{{ $t("pages.about.page.our_mission-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.about.page.our_mission-text") }}
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <h4>{{ $t("pages.about.page.unique_approach-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.about.page.unique_approach-text") }}
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <h4>{{ $t("pages.about.page.building_community-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.about.page.building_community-text") }}
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <h4>{{ $t("pages.about.page.looking_ahead-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.about.page.looking_ahead-text") }}
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <h4>{{ $t("pages.about.page.join_us-title") }}</h4>
        <p class="text-body-2">
          {{ $t("pages.about.page.join_us-text") }}
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
