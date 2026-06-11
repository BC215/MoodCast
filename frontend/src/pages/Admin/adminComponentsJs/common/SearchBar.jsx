import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import styles from "../../adminComponentsCss/common/SearchBar.module.css";

export function SearchBar({
  placeholder = "\uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD558\uC138\uC694.",
  value,
  onChange,
}) {
  return (
    <label className={styles.searchBar}>
      <SearchOutlinedIcon />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}
