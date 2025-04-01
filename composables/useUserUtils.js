// composables/useUserUtils.js

export const getAvatarIcon = (gender_id) => {
  switch (gender_id) {
    case 1:
      return "mdi-gender-male";
    case 2:
      return "mdi-gender-female";
    default:
      return "mdi-gender-male-female";
  }
};

export const getAvatar = (avatar_url, gender_id) => {
  if (!avatar_url) {
    if (gender_id === 1) {
      return "/images/avatars/anonymous-blue.png";
    } else if (gender_id === 2) {
      return "/images/avatars/anonymous-pink.png";
    } else {
      return "/images/avatars/anonymous.png";
    }
  } else {
    return avatar_url;
  }
};

export const getGenderColor = (gender_id) => {
  switch (gender_id) {
    case 1:
      return "blue-darken-2";
    case 2:
      return "pink-darken-2";
    default:
      return "purple-darken-2";
  }
};

export const getGenderColorClass = (gender_id) => {
  switch (gender_id) {
    case 1:
      return "male";
    case 2:
      return "female";
    default:
      return "other";
  }
};
