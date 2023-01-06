import React from 'react';
import styles from "./Button.module.scss";

type ButtonProps = {
  children: React.ReactNode,
  onClick: () => void,
  className: string,
  disabled?: boolean,
};

const stylesMap: { [key: string]: string } = {
  primary: styles.primary,
  secondary: styles.secondary,
};

const Button = (props: ButtonProps) => (
  <button type="button" onClick={props.onClick} className={`btn ${stylesMap[props.className]}`} disabled={props.disabled}>{props.children}</button>
);

export default Button;
