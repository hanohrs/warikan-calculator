import React from "react";

type ButtonProps = {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
};

const Button = (props: ButtonProps) => {
  const { className = "" } = props;
  return (
    <button
      className={`bg-black hover:bg-gray-700 text-white flex justify-center items-center py-2 px-4 rounded-lg ${className}`}
      onClick={props.onClick}
      type="submit"
    >
      {props.children}
    </button>
  );
};

export default Button;
